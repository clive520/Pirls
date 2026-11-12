import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getSubmissionById, getTestPaperById, saveSubmissionDirectly } from '@/lib/db';
import { extractAndParseJSON } from '@/lib/json-helper';
import { TestPaper, ExamSubmission, AiPedagogicalAdvice } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ error: '無教師閱卷權限' }, { status: 403 });
    }

    const submissionId = params.id;
    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json({ error: '找不到該受測紀錄' }, { status: 404 });
    }

    const testPaper = await getTestPaperById(submission.testPaperId);
    if (!testPaper) {
      return NextResponse.json({ error: '找不到對應試卷' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const saveToDb = body.saveToDb ?? true;
    const currentScores: Record<string, number> = body.currentScores || {};
    const apiKey = (body.apiKey || '').trim() || process.env.GEMINI_API_KEY?.trim();

    // 動態計算四層次得分與掌握率（包含當前教師最新核定/調整的分數）
    const levelsScore = {
      level1: { earned: 0, total: 0, percentage: 0 },
      level2: { earned: 0, total: 0, percentage: 0 },
      level3: { earned: 0, total: 0, percentage: 0 },
      level4: { earned: 0, total: 0, percentage: 0 },
    };

    submission.answers.forEach((ans) => {
      const q = testPaper.questions?.find((item) => item.id === ans.questionId);
      const lvlNum = q?.processLevelNumber;
      let target: 'level1' | 'level2' | 'level3' | 'level4' = 'level1';
      if (lvlNum === 2 || q?.processLevel === 'inference') target = 'level2';
      else if (lvlNum === 3 || q?.processLevel === 'interpret') target = 'level3';
      else if (lvlNum === 4 || q?.processLevel === 'evaluate') target = 'level4';

      const curScore = currentScores[ans.questionId] !== undefined ? currentScores[ans.questionId] : ans.score;
      levelsScore[target].earned += curScore;
      levelsScore[target].total += ans.maxScore;
    });

    (['level1', 'level2', 'level3', 'level4'] as const).forEach((k) => {
      levelsScore[k].percentage = levelsScore[k].total > 0
        ? Math.round((levelsScore[k].earned / levelsScore[k].total) * 100)
        : 0;
    });

    // 整理題目答題情境（聚焦開放簡答題與失分題，以便 AI 深入對照文章事實）
    const questionDetails = submission.answers.map((ans) => {
      const q = testPaper.questions?.find((item) => item.id === ans.questionId);
      const earned = currentScores[ans.questionId] !== undefined ? currentScores[ans.questionId] : ans.score;
      return {
        qNum: ans.questionNumber,
        levelNum: ans.processLevelNumber,
        levelName: ans.processLevel,
        type: ans.type,
        earned,
        maxScore: ans.maxScore,
        prompt: q?.prompt || '',
        studentAnswer: ans.studentAnswer || '',
        sampleAnswer: q?.rubric?.sampleFullCreditAnswer || '',
        criteriaSummary: q?.rubric?.criteria?.map((c) => `[${c.score}分] ${c.description}`).join('； ') || '',
        aiFeedback: ans.aiFeedback,
      };
    });

    let advice: AiPedagogicalAdvice | null = null;

    // 1. 若有 API Key，優先調用 Google Gemini 大模型進行深度教育診斷
    if (apiKey) {
      try {
        advice = await callGeminiForPedagogicalAdvice({
          testPaper,
          submission,
          processScores: levelsScore,
          questionDetails,
          apiKey,
        });
      } catch (geminiErr) {
        console.warn('[AI Pedagogical Advice] Gemini 調用異常，切換至備援引擎:', geminiErr);
      }
    }

    // 2. 若未配置金鑰或調用超時，採用結合文本與錯題的智慧備援診斷
    if (!advice) {
      advice = generateFallbackPedagogicalAdvice({
        testPaper,
        submission,
        processScores: levelsScore,
        questionDetails,
      });
    }

    // 3. 持久化存入 Firestore
    if (saveToDb && advice) {
      submission.aiPedagogicalAdvice = advice;
      await saveSubmissionDirectly(submission);
    }

    return NextResponse.json({
      success: true,
      advice,
      submission,
    });
  } catch (err: any) {
    console.error('[AI Pedagogical Advice Error]:', err);
    return NextResponse.json({ error: err.message || '生成失敗' }, { status: 500 });
  }
}

/**
 * 透過 Google Gemini 2.0 / 1.5 進行真 AI 深度落點分析與閱讀教練指南
 */
async function callGeminiForPedagogicalAdvice(params: {
  testPaper: TestPaper;
  submission: ExamSubmission;
  processScores: Record<'level1' | 'level2' | 'level3' | 'level4', { earned: number; total: number; percentage: number }>;
  questionDetails: any[];
  apiKey: string;
}): Promise<AiPedagogicalAdvice | null> {
  const { testPaper, submission, processScores: p, questionDetails, apiKey } = params;

  const systemInstruction = `你是一位享譽國際的 IEA PIRLS (國際閱讀素養進展研究) 官方專家評委與語文素養領域資深輔導團顧問。
請根據學生在整份閱讀測驗中的作答表現，深度對照「課文全文情節」與「學生的具體作答內容」，為這位小學生量身打造一份充滿溫度、具象且切中關鍵的【閱讀成長教練指南】。

【核心原則】：
1. 拒絕空泛套話：禁止使用高階抽象教育學名詞（如「以讀者視角客觀評析寫作手法」），對象是國小學童，請用孩子能讀懂、親切且鼓勵的語氣。
2. 照鏡子式精準對照：在錯題鏡像中，必須【引用學生真實寫的原話】與【課文具體段落情節或主角台詞】，清楚點出落差與滿分示範。
3. 具體可落地的祕技：給予孩子 2~3 個好記好用的答題口訣或通關祕技（如拉長句子魔法、轉折詞尋寶法）。
4. 輸出格式強制為合法 JSON 物件，請勿輸出額外贅字：
{
  "thinkingProfile": {
    "superpower": {
      "title": "本次展現的思維超能力（例如：細節神探、因果偵探、心境解密師、批判鑑賞家）",
      "description": "用 1~2 句親切溫暖的話，具體指出他在本篇文章中哪個部分/題型表現得特別棒、特別敏銳"
    },
    "unlockingSkill": {
      "title": "正在解鎖的高階技能（例如：心境翻譯官、線索拼圖師、作者心思解密員）",
      "description": "用 1~2 句充滿激勵的話，指出他接下來只要掌握什麼關鍵，就能讓理解更上層樓"
    }
  },
  "questionMirrors": [
    {
      "questionNumber": 5,
      "prompt": "題目題幹摘要",
      "studentAnswer": "學生當時寫的原話（務必引用學生真實作答）",
      "clueFromArticle": "課文在此題藏著的秘密線索（引用課文具體情節、段落或角色說的話）",
      "howToImprove": "下次這樣寫就能拿滿分（肯定學生寫對的部分，示範如何加入課文線索補強成滿分答案）"
    }
  ],
  "tacticsTips": [
    "【通關小祕技名稱】：具體操作法（例如：簡答題寫完後，檢查有沒有加上「因為課文提到...」）",
    "【通關小祕技名稱】：具體操作法..."
  ],
  "microAction": "本週專屬的 1 個閱讀微任務（小而精，例如：這週在國語課讀課文時，挑選 1 句主角說的話...）",
  "levelAnalysis": "針對四層次能力的綜合深入解析（約 120-180 字，具體提及課文故事名稱、主角/主題、在各層次的具體表現與思維特徵）",
  "improvementSuggestions": [
    "【策略標題】：結合本篇課文具體情節與學生作答落差的精進建議...",
    "【策略標題】：結合本篇課文具體情節與學生作答落差的精進建議..."
  ],
  "actionPlan": "針對本課文體與弱項的自主閱讀精進計畫（約 60 字）",
  "teacherFeedbackDraft": "富有教育溫度的教師親筆評語草稿（約 80-120 字，提及學生本次在該篇文章中的表現、肯定其亮點並給予勉勵）"
}`;

  // 格式化關鍵題目作答與文章對照
  const questionsPrompt = questionDetails
    .map((q) => {
      const isLoss = q.earned < q.maxScore;
      return `【第 ${q.qNum} 題】(層次：${q.levelName || 'L' + q.levelNum}，滿分 ${q.maxScore} 分，實得 ${q.earned} 分${isLoss ? ' [失分題]' : ' [滿分]'})
題幹：${q.prompt}
學生作答：${q.studentAnswer ? `"${q.studentAnswer}"` : '（空白未答）'}
滿分規準要點：${q.sampleAnswer || q.criteriaSummary || '能依文章事實完整回答'}
${q.aiFeedback ? `AI 初評診斷：亮點「${q.aiFeedback.strength || '無'}」，待加強「${q.aiFeedback.weakness || '無'}」` : ''}`;
    })
    .join('\n\n');

  const userPrompt = `【文章標題】《${testPaper.title}》（${testPaper.targetGrade} 年級，${testPaper.textType === 'literary' ? '文學性故事' : '訊息性說明文'}）
【課文全文節錄】
${testPaper.articleContent.slice(0, 2200)}

【受測學生】：${submission.studentName} 同學
【學生四層次思維能力掌握率統計】
- 第一層（直接提取訊息）：${p.level1.earned} / ${p.level1.total} 分 (${p.level1.percentage}%)
- 第二層（直接推論）：${p.level2.earned} / ${p.level2.total} 分 (${p.level2.percentage}%)
- 第三層（詮釋整合觀點）：${p.level3.earned} / ${p.level3.total} 分 (${p.level3.percentage}%)
- 第四層（檢驗評估）：${p.level4.earned} / ${p.level4.total} 分 (${p.level4.percentage}%)

【學生各題作答與失分詳情】
${questionsPrompt}

請以國小語文閱讀教練的視角，為 ${submission.studentName} 同學量身生成 JSON 結構化深度診斷與答題鏡像建議。`;

  const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = extractAndParseJSON<any>(rawText);
      if (parsed && (parsed.levelAnalysis || parsed.thinkingProfile)) {
        return {
          thinkingProfile: parsed.thinkingProfile || undefined,
          questionMirrors: Array.isArray(parsed.questionMirrors) ? parsed.questionMirrors : undefined,
          tacticsTips: Array.isArray(parsed.tacticsTips) ? parsed.tacticsTips : undefined,
          microAction: parsed.microAction || undefined,
          levelAnalysis: parsed.levelAnalysis || '',
          improvementSuggestions: Array.isArray(parsed.improvementSuggestions)
            ? parsed.improvementSuggestions.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
            : [],
          actionPlan: parsed.actionPlan || parsed.microAction || `每週安排 2 次精讀《${testPaper.title}》同類型文體，對照因果情節練習深層詮釋。`,
          teacherFeedbackDraft: parsed.teacherFeedbackDraft || `${submission.studentName} 同學在《${testPaper.title}》評量中思維敏銳，只要持續對照課文細節補充論據，表現定能更加亮眼！`,
          isAiGenerated: true,
          generatedAt: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn(`[AI Advice Gemini] model ${model} 調用異常:`, e);
    }
  }

  return null;
}

/**
 * 智慧型動態規則備援引擎（無 API Key 或連線超時時，保證零中斷且精準結合真實作答與課文事實）
 */
function generateFallbackPedagogicalAdvice(params: {
  testPaper: TestPaper;
  submission: ExamSubmission;
  processScores: Record<'level1' | 'level2' | 'level3' | 'level4', { earned: number; total: number; percentage: number }>;
  questionDetails: any[];
}): AiPedagogicalAdvice {
  const { testPaper, submission, processScores: p, questionDetails } = params;

  const levels = [
    { num: 1, name: '第一層：直接提取訊息', pct: p.level1.percentage, earned: p.level1.earned, total: p.level1.total },
    { num: 2, name: '第二層：直接推論', pct: p.level2.percentage, earned: p.level2.earned, total: p.level2.total },
    { num: 3, name: '第三層：詮釋整合觀點', pct: p.level3.percentage, earned: p.level3.earned, total: p.level3.total },
    { num: 4, name: '第四層：檢驗與評估', pct: p.level4.percentage, earned: p.level4.earned, total: p.level4.total },
  ];

  const sortedByPct = [...levels].sort((a, b) => b.pct - a.pct);
  const strongest = sortedByPct[0];
  const weakest = sortedByPct[sortedByPct.length - 1];

  const isLit = testPaper.textType === 'literary';
  const textTypeName = isLit ? '文學性故事' : '訊息性科普說明文';

  // 1. 打造孩子專屬思維超能力與解鎖技能
  const superpowerMap: Record<number, { title: string; description: string }> = {
    1: {
      title: '細節神探',
      description: `你在《${testPaper.title}》中對關鍵事實與故事細節有極高的敏銳度，能像偵探一樣快速揪出人事物線索！`,
    },
    2: {
      title: '因果偵探',
      description: `你在《${testPaper.title}》中能敏銳辨識主角行為前後的因果關聯，直接推論思維非常扎實！`,
    },
    3: {
      title: '心境解密師',
      description: `你能穿透文字表層，跨段落統整出人物的情感轉變與整篇文章的核心意涵，綜合分析力令人讚賞！`,
    },
    4: {
      title: '批判鑑賞家',
      description: `你具備成熟的讀者視角，能客觀評估作者的寫作安排、修辭手法與情感表達，展現高階鑑賞力！`,
    },
  };

  const unlockingSkillMap: Record<number, { title: string; description: string }> = {
    1: {
      title: '線索定位鏡',
      description: '遇到細節題時，試著在課文裡用手指圈出關鍵詞，確認完全吻合再作答，就能穩拿基本盤！',
    },
    2: {
      title: '因果串接術',
      description: '遇到探討「為什麼」的推論題時，答案往往藏在前後相鄰的句子裡，找出關鍵起因就能精準破題！',
    },
    3: {
      title: '心境翻譯官',
      description: '遇到簡答題考驗情感轉變時，試著寫出「起初...後來因為經歷了...所以變成...」，論述更加飽滿！',
    },
    4: {
      title: '作者心思解密員',
      description: '試著從讀者角度思考：「作者為什麼要這樣安排情節或挑選這個詞句？」大膽寫下你的感受與佐證！',
    },
  };

  const thinkingProfile = {
    superpower: superpowerMap[strongest.num] || superpowerMap[1],
    unlockingSkill: unlockingSkillMap[weakest.num] || unlockingSkillMap[3],
  };

  // 2. 篩選學生真實失分題目，打造「錯題鏡像對照鏡 (Question Mirrors)」
  const missedQuestions = questionDetails.filter((q) => q.earned < q.maxScore);
  // 優先挑選簡答題 (constructed_response) 與失分最大的題目
  const sortedMissed = [...missedQuestions].sort((a, b) => {
    if (a.type === 'constructed_response' && b.type !== 'constructed_response') return -1;
    if (b.type === 'constructed_response' && a.type !== 'constructed_response') return 1;
    return (b.maxScore - b.earned) - (a.maxScore - a.earned);
  });

  const selectedForMirror = sortedMissed.slice(0, 2);
  const questionMirrors: any[] = [];

  selectedForMirror.forEach((q) => {
    const rawAnswer = (q.studentAnswer || '').trim();
    const hasAnswer = rawAnswer.length > 0;
    const clueText = q.sampleAnswer || q.criteriaSummary || '課文相關段落中的具體事件與主角關鍵動作';
    
    let howToImproveText = '';
    if (hasAnswer) {
      howToImproveText = `你已經回答出「${rawAnswer.slice(0, 25)}${rawAnswer.length > 25 ? '...' : ''}」的方向，非常棒！如果能在答案中多補上一句課文具體事實（例如：${q.sampleAnswer ? q.sampleAnswer.slice(0, 30) + '...' : '結合文章中的關鍵情節佐證'}），就能穩拿滿分 ${q.maxScore} 分喔！`;
    } else {
      howToImproveText = `這題空白太可惜了！遇到這類簡答題，即使不確定，只要先寫出你對課文情節的印象，並附上主角的名字或動作，就能爭取到關鍵分數喔！`;
    }

    questionMirrors.push({
      questionNumber: q.qNum,
      prompt: q.prompt,
      studentAnswer: hasAnswer ? rawAnswer : '（當時空白未答）',
      clueFromArticle: `課文在此題的核心線索在於：${clueText}`,
      howToImprove: howToImproveText,
    });
  });

  // 若學生全對（滿分），給予高階典範鼓勵
  if (questionMirrors.length === 0 && questionDetails.length > 0) {
    const topQ = questionDetails.find((q) => q.type === 'constructed_response') || questionDetails[questionDetails.length - 1];
    questionMirrors.push({
      questionNumber: topQ.qNum,
      prompt: topQ.prompt,
      studentAnswer: topQ.studentAnswer || '作答完整',
      clueFromArticle: `課文核心精髓：${topQ.sampleAnswer || '完整掌握文章脈絡與情節要義'}`,
      howToImprove: `表現卓越！你的作答既切合題旨，又能引用課文具體細節作為有力論據，是全班極佳的答題典範！`,
    });
  }

  // 3. 答題通關小祕技 (Tactics Tips)
  const tacticsTips = [
    '【拉長句子魔法】：回答簡答題時，千萬別只寫單詞，試著用「因為課文提到……所以導致……，這說明了……」將想法說完整！',
    '【課文事實雙重錨定】：給出自己的想法後，記得務必在答案裡「引用文章中的 1 個具體動作、對話或情節」，有憑有據就能拿滿分！',
    '【關鍵字尋寶法】：題幹裡的生字詞或特定物件，就是回到課文的「門牌號碼」，回到該詞的前後兩句仔細閱讀，答案通常就在身邊！',
  ];

  // 4. 本週閱讀微任務 (Micro-Action)
  const microAction = isLit
    ? `這週閱讀下一篇故事時，挑選 1 個最吸引你的情節，問自己：「主角為什麼在這個時候做這個決定？」並在課文找出 1 句證據！`
    : `這週閱讀說明文時，挑出 1 個新學到的知識點，試著用自己的話說給家人或同學聽：「這篇文章告訴我們……」練習提煉核心概念！`;

  // 5. 四層次落點綜合解析 (保留相容)
  const levelAnalysis = `在本次《${testPaper.title}》（${textTypeName}）閱讀評量中，你在【${strongest.name}】（得分率 ${strongest.pct}%）展現出最卓越的「${thinkingProfile.superpower.title}」思維特質；而在【${weakest.name}】（得分率 ${weakest.pct}%）則是接下來啟動「${thinkingProfile.unlockingSkill.title}」的最佳躍升點！只要掌握作答時引用課文事實的習慣，理解力將能全方位突破！`;

  // 6. 給學生的改進建議 (舊版相容)
  const improvementSuggestions = [
    `【思維亮點—${thinkingProfile.superpower.title}】：${thinkingProfile.superpower.description}`,
    `【解鎖密碼—${thinkingProfile.unlockingSkill.title}】：${thinkingProfile.unlockingSkill.description}`,
  ];
  if (selectedForMirror.length > 0) {
    improvementSuggestions.push(
      `【真實作答升級示範】：針對第 ${selectedForMirror[0].qNum} 題，作答時只要將課文的關鍵事實補上，就能把 1~2 分的落差補滿！`
    );
  }

  // 7. 教師親筆綜合評語草稿
  const teacherFeedbackDraft = `${submission.studentName} 同學在本次《${testPaper.title}》閱讀評量中展現了「${thinkingProfile.superpower.title}」的敏銳特質！特別在第 ${selectedForMirror.length > 0 ? selectedForMirror[0].qNum : 1} 題若能再深入結合課文細節，思維表現定能全面飛躍，老師對你很有信心，繼續加油！`;

  return {
    thinkingProfile,
    questionMirrors,
    tacticsTips,
    microAction,
    levelAnalysis,
    improvementSuggestions,
    actionPlan: microAction,
    teacherFeedbackDraft,
    isAiGenerated: false,
    generatedAt: new Date().toISOString(),
  };
}
