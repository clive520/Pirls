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
 * 透過 Google Gemini 2.5 / 2.0 進行真 AI 深度落點分析與閱讀建議
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
請根據學生在整份閱讀測驗中的作答表現，深度對照「課文全文情節」與「學生的具體作答內容」，進行高水準的教育診斷。

【核心原則】：
1. 拒絕空泛套話：禁止只給「圈畫時間地點」、「用因為所以」等通用空泛模板，必須【具體引用本篇課文的人物、情節、段落、或核心詞語】！
2. 深度分析落差：針對學生失分或作答不夠完整的題目，深入指出其回答與課文事實/情節轉折之間的「精確落差」（例如：在第X題，學生僅提到...，但忽略了課文中...的關鍵轉折）。
3. 量身打造建議：給出 3~4 項具有高教學價值的「具體閱讀策略與改進建議」，每一項必須包含策略標題（如【...】）與具體說明，清楚告訴學生在閱讀本篇文章或同類文章時，作答內容與課文細節有何落差，應如何回到課文某情節或某段落找線索、補強論述。
4. 輸出格式強制為合法 JSON 物件，請勿輸出額外贅字：
{
  "levelAnalysis": "針對四層次能力的綜合深入解析（約 150-250 字，具體提及課文故事名稱、主角/主題、在各層次的具體表現與思維特徵）",
  "improvementSuggestions": [
    "【策略標題】：結合本篇課文具體情節與學生作答落差的精進建議...",
    "【策略標題】：結合本篇課文具體情節與學生作答落差的精進建議...",
    "【策略標題】：結合本篇課文具體情節與學生作答落差的精進建議..."
  ],
  "actionPlan": "針對本課文體（文學/訊息性）與該生思維弱項的每週自主閱讀精進計畫（約 60-100 字）",
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

請以專業 PIRLS 閱讀評委視角，對照課文具體情節與學生的實際作答落差，輸出 JSON 結構化深度診斷與量身精進建議。`;

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

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
      if (parsed && parsed.levelAnalysis && Array.isArray(parsed.improvementSuggestions)) {
        return {
          levelAnalysis: parsed.levelAnalysis,
          improvementSuggestions: parsed.improvementSuggestions.filter((s: any) => typeof s === 'string' && s.trim().length > 0),
          actionPlan: parsed.actionPlan || `每週安排 2 次精讀《${testPaper.title}》同類型文體，對照因果情節練習深層詮釋。`,
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
 * 智慧型動態規則備援引擎（無 API Key 時保證零中斷且精準結合文本與題目）
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

  // 1. 各層次思維能力落點分析
  const levelAnalysis = `在本次《${testPaper.title}》（${textTypeName}）閱讀評量中，你在【${strongest.name}】（得分率 ${strongest.pct}%）展現出最卓越的思維掌握度，能夠精準把握文中的核心事實與關鍵線索；而在【${weakest.name}】（得分率 ${weakest.pct}%）則有較多進步空間。整體四維思考落點呈現「${strongest.pct >= 80 ? '高階推論領航' : '循序漸進'}」的特質，只要針對弱項思維習慣進行微調，深入比對課文細節與前後因果，閱讀理解力將能全面躍升！`;

  // 2. 給學生的具體閱讀改進建議事項
  const improvementSuggestions: string[] = [];

  // 尋找簡答題或失分題的實質線索
  const flawedCr = questionDetails.find((q) => q.type === 'constructed_response' && q.earned < q.maxScore);
  const anyLoss = questionDetails.find((q) => q.earned < q.maxScore);

  if (p.level1.percentage < 80) {
    improvementSuggestions.push(
      `【關鍵細節定位精讀】：在閱讀《${testPaper.title}》這類篇幅較長的文章時，養成圈畫關鍵字詞、人物主旨與時間轉折的習慣，避免在細節提取題型中因匆促作答而遺漏關鍵訊息。`
    );
  } else {
    improvementSuggestions.push(
      `【維持高度事實定位力】：你對《${testPaper.title}》文章中關鍵細節的敏銳度極高！能快速精確找到文章的事實線索，這是高層次推論思考非常堅實的基礎。`
    );
  }

  if (p.level2.percentage < 80) {
    improvementSuggestions.push(
      `【追蹤課文因果轉折鏈】：遇到探究「為什麼主角會這樣做」或「事件起因」的推論題時，答案往往隱含在相鄰句子的前後關聯中。試著在心中梳理「因為課文提到……所以導致……」，就能精確推導出隱含意義。`
    );
  } else {
    improvementSuggestions.push(
      `【因果推論脈絡清晰】：你在直接推論層次表現十分沉穩，能敏銳辨識課文文字背後未明說的因果關係與情節走向。`
    );
  }

  if (p.level3.percentage < 80) {
    improvementSuggestions.push(
      `【跨段落統整人物心境與轉折】：遇到簡答題考驗心態轉變或核心主旨時，作答請採取「前後對比法」：清楚寫出起初的情境、中間經歷的關鍵事件、以及最後轉變後的具體表現，並確實引用課文的情節詞句作為佐證。`
    );
  } else {
    improvementSuggestions.push(
      `【深層主旨綜合詮釋精準】：你能跨越不同自然段落，統整並歸納出整篇文本的核心精神與深刻意涵，綜合分析能力令人讚賞！`
    );
  }

  if (p.level4.percentage < 80) {
    improvementSuggestions.push(
      `【以讀者視角客觀評析寫作手法】：第四層檢驗評估題要求從讀者角度審視「作者為什麼這樣安排或使用這些詞語」。回答時試著結合文章表達效果（例如營造何種氛圍、凸顯何種情感），並提供生活經驗或理性論據對照。`
    );
  } else {
    improvementSuggestions.push(
      `【具備優秀批判反思視角】：你能客觀評估文章的敘述手法、用詞精妙度與觀點立場，展現出高階閱讀者必備的批判性思考力！`
    );
  }

  if (flawedCr) {
    improvementSuggestions.push(
      `【簡答題滿分秘訣—觀點＋課文事實佐證】：如第 ${flawedCr.qNum} 題，作答時請切記「結論＋雙重理由」的原則，務必至少引用課文中的 1~2 項具體情節作為證據，就能穩拿滿分規準！`
    );
  }

  // 3. 具體行動計畫
  const actionPlan = `建議每週固定安排 1～2 次 15 分鐘深度閱讀，讀完《${testPaper.title}》同文體文章後，挑選 1 個最引發共鳴的情節，在筆記本寫下「我認為作者這樣寫非常吸引人，因為……」練習第四層檢驗思考。`;

  // 4. 教師親筆綜合評語草稿
  const teacherFeedbackDraft = `${submission.studentName} 同學在本次《${testPaper.title}》閱讀評量中表現用心！特別在【${strongest.name}】展現了清晰敏銳的思考；針對【${weakest.name}】的部分，請參考上方為你整理的具體精讀與答題建議，相信你下次一定能更上一層樓！`;

  return {
    levelAnalysis,
    improvementSuggestions,
    actionPlan,
    teacherFeedbackDraft,
    isAiGenerated: false,
    generatedAt: new Date().toISOString(),
  };
}
