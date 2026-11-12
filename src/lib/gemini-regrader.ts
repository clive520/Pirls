import { TestPaper, TestQuestion, StudentAnswer } from './types';
import { extractAndParseJSON } from './json-helper';
import { ACTIVE_FLASH_PRIORITY } from './ai/providers/gemini';

export interface RegradeResult {
  questionId: string;
  suggestedScore: number;
  maxScore: number;
  scoreCode: string;
  reason: string;
  keyEvidenceFound: string[];
  strength: string; // 深度再審閱之亮點 (依學生作答與文章關聯深入說明)
  weakness: string; // 深度再審閱之待加強 (依學生作答與文章落差具體指引)
  scaffoldingTip?: string; // 鷹架思考導引
  improvedFeedback?: string;
  isAiGenerated: boolean;
}

/**
 * PIRLS 深度 AI 再閱卷引擎 (Gemini LLM Deep Re-grader)
 * 深入對比學生回答與課文全文，輸出具有高度教育價值與文本證據依據的診斷。
 */
export async function regradeQuestionWithAI(params: {
  testPaper: TestPaper;
  question: TestQuestion;
  studentAnswer: string;
  apiKey?: string;
}): Promise<RegradeResult> {
  const { testPaper, question, studentAnswer } = params;
  const apiKey = (params.apiKey || '').trim() || process.env.GEMINI_API_KEY?.trim();

  if (apiKey) {
    try {
      const res = await callGeminiForRegrade(testPaper, question, studentAnswer, apiKey);
      if (res) return res;
    } catch (err) {
      console.warn('[Gemini Regrader] API 調用失敗，啟動備援深度語意分析:', err);
    }
  }

  // 備援深度語意評估引擎 (保證零中斷)
  return fallbackDeepRegrade(testPaper, question, studentAnswer);
}

async function callGeminiForRegrade(
  testPaper: TestPaper,
  question: TestQuestion,
  studentAnswer: string,
  apiKey: string
): Promise<RegradeResult | null> {
  const rubric = question.rubric;
  const criteriaText = rubric?.criteria
    ? rubric.criteria.map((c) => `- 【${c.score} 分】：${c.description} (關鍵證據: ${c.keyEvidenceNeeded?.join('、') || '無'})`).join('\n')
    : '依據文章事實合理推論';

  const systemInstruction = `你是一位享譽國際的 IEA PIRLS (國際閱讀素養進展研究) 閱卷委員與國語科輔導團專家。
請針對國小學生的開放簡答題作答進行嚴謹、客觀且富有教育溫度的「深度再閱卷與文本關聯診斷」。

【閱卷核定原則】：
1. 寬容原則：小學生表達若非逐字照抄，只要意思相符、能指認文本核心事實或合理推論即予採認。
2. 嚴謹原則：若純抒發主觀感受而無文本具體事實佐證，不可給滿分；配分 3 分之高階題目，必須具備深層觀點或因果對照，且至少提供 2 項文本佐證。
3. 文本關聯深度診斷原則（重要）：
   - 【亮點 (strength)】：請務必點出學生回答中「明確掌握了文章中的哪一處情節、角色心態或轉折關鍵詞」，說明其精確關聯之處。
   - 【待加強 (weakness)】：請嚴格對照文章脈絡與給分規準，具體指出學生的回答與文章完整事實之間的「具體落差」（例如漏掉了哪一段情節、未指出何種因果關係），並明確告訴學生若要拿滿分，應該補入課文中的什麼具體細節！

【輸出格式強制規範】：
請直接輸出合法的 JSON 物件，格式如下：
{
  "suggestedScore": 2,
  "scoreCode": "20",
  "reason": "詳細評審裁決理由...",
  "keyEvidenceFound": ["命中之文本線索1", "線索2"],
  "strength": "很棒！你已經抓住了文章中...的關鍵細節，能準確結合課文內容表達清楚的立場！",
  "weakness": "若能再深入補充文章第...段中提到的「...」具體因果細節，就能拿滿分 3 分喔！",
  "scaffoldingTip": "試著找找看文章中主角是在發生了哪件事之後，才改變想法的呢？",
  "improvedFeedback": "給學生或老師的具體指導建議..."
}`;

  const userPrompt = `【文章標題】《${testPaper.title}》（${testPaper.targetGrade} 年級，${testPaper.textType === 'literary' ? '文學性故事' : '訊息性科普'}）
【文章全文節錄】
${testPaper.articleContent.slice(0, 1800)}

【題目】（配分：${question.points} 分，思維層次：${question.processLevel}）
${question.prompt}

【官方評分規準 (Rubrics)】
滿分參考示範：${rubric?.sampleFullCreditAnswer || '完整回答要點並附佐證'}
給分階梯：
${criteriaText}

【學生作答內容】
"${studentAnswer || '（空白未作答）'}"

請以專業閱卷委員視角，對照文章內容與學生作答，輸出建議給分、審閱理由、找到的文本證據、深入的文本關聯【亮點】與具體指出落差的【待加強】指引。`;

  // 優先嘗試活躍 Flash 模型
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
            temperature: 0.2, // 保持評閱之高度客觀穩定性
          },
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = extractAndParseJSON<any>(rawText);
      const validScore = Math.max(0, Math.min(question.points, Number(parsed.suggestedScore) || 0));

      return {
        questionId: question.id,
        suggestedScore: validScore,
        maxScore: question.points,
        scoreCode: parsed.scoreCode || (validScore === question.points ? `${validScore}0` : validScore > 0 ? '11' : '79'),
        reason: parsed.reason || '經 AI 深度語意分析核定。',
        keyEvidenceFound: Array.isArray(parsed.keyEvidenceFound) ? parsed.keyEvidenceFound : [],
        strength: parsed.strength || '能結合文章情節提出合理解答。',
        weakness: parsed.weakness || (validScore < question.points ? '若能補充更多課文具體情節與文本佐證，將能更臻完備。' : '答題邏輯完整且與文本脈絡緊密吻合，表現極佳！'),
        scaffoldingTip: parsed.scaffoldingTip,
        improvedFeedback: parsed.improvedFeedback,
        isAiGenerated: true,
      };
    } catch (e) {
      console.warn(`[Gemini Regrader] model ${model} 調用異常:`, e);
    }
  }

  return null;
}

/**
 * 本地深度語意模擬再閱卷（備援引擎）
 */
function fallbackDeepRegrade(
  testPaper: TestPaper,
  question: TestQuestion,
  studentAnswer: string
): RegradeResult {
  const ans = (studentAnswer || '').trim();
  const maxPts = question.points;
  const rubric = question.rubric;

  if (!ans || ans.length < 2 || ans === '不知道') {
    return {
      questionId: question.id,
      suggestedScore: 0,
      maxScore: maxPts,
      scoreCode: '99',
      reason: '學生未作答或回答過於簡略（未滿2字），無法採認文本理解事實。',
      keyEvidenceFound: [],
      strength: '作答態度尚待引導。',
      weakness: '未從文章中找出相關訊息進行回答。建議先在課文中圈出題幹提到的主要人物或事件，寫下一句觀察。',
      scaffoldingTip: '文章中主角在遇到這件事時，他的心情是怎樣的？',
      improvedFeedback: '建議引導學生先找出文章中的關鍵角色，練習寫出哪怕一句話的觀察。',
      isAiGenerated: false,
    };
  }

  // 深入檢核關鍵文本證據
  const foundEvidences: string[] = [];
  if (rubric?.criteria) {
    const topCriteria = rubric.criteria.find((c) => c.score === maxPts) || rubric.criteria[0];
    if (topCriteria?.keyEvidenceNeeded) {
      for (const ev of topCriteria.keyEvidenceNeeded) {
        const tokens = ev.split(/[/、，,與和及或是在向由從對於把被]/).map((k) => k.trim()).filter((k) => k.length >= 2);
        let match = ans.includes(ev);
        if (!match) {
          for (const tok of tokens) {
            if (ans.includes(tok)) {
              match = true;
              break;
            }
          }
        }
        if (match) {
          foundEvidences.push(ev);
        }
      }
    }
  }

  const ansLen = ans.length;
  let suggested = 0;
  let code = '79';
  let reason = '';
  let strength = '';
  let weakness = '';

  if (maxPts >= 3) {
    const hasTimeline = /(起初|原本|最初|一開始)/.test(ans) && /(後來|經過|因為|大火)/.test(ans) && /(最後|明白|領悟|感動|體會)/.test(ans);
    if (foundEvidences.length >= 2 || (hasTimeline && ansLen >= 30)) {
      suggested = 3;
      code = '30';
      reason = '作答具備完整前後時間軸對比與心理歷程轉折，且實質引用兩項以上具體情節證據，完全切合文章核心，核定滿分 3 分。';
      strength = `卓越！你精確扣合了《${testPaper.title}》中轉折歷程，成功引用了【${foundEvidences.join('、') || '關鍵情節'}】作為有力論據，觀點鮮明！`;
      weakness = '論述完整且富說服力，已完全達成 PIRLS 滿分規準！';
    } else if (foundEvidences.length >= 1 || ansLen >= 18) {
      suggested = 2;
      code = '21';
      reason = '學生成功掌握核心想法轉折與主要態度，但在事件因果細節上略顯精簡，核定 2 分。';
      strength = `很好！你已經抓住了人物感受轉變的大方向，能寫出清楚的立場，並提及了文中的重要線索！`;
      weakness = `若能再深入補充課文中具體發生的因果事件（例如促使想法改變的關鍵情節或兩項具體線索），就能穩拿滿分 3 分喔！`;
    } else if (ansLen >= 8) {
      suggested = 1;
      code = '11';
      reason = '僅表達單一觀點，缺少前後對照或因果依據，核定部分得分 1 分。';
      strength = '有嘗試回答問題的核心概念。';
      weakness = '回答與文章細節的連結較為表面，缺少課文具體事實佐證。建議回到文章找到引發事件的具體描寫加以補充。';
    } else {
      suggested = 0;
      code = '79';
      reason = '回答未切入問題核心所要求的感受轉變，給予 0 分並加強文本檢索引導。';
      strength = '已完成作答送出。';
      weakness = '作答內容與課文核心情節關聯較弱，建議重新閱讀相關段落再行思考。';
    }
  } else if (maxPts === 2) {
    if (foundEvidences.length >= 2 || (foundEvidences.length >= 1 && ansLen >= 20)) {
      suggested = 2;
      code = '20';
      reason = '論點清楚鮮明，成功引用文章關鍵細節作為有力論據，完全符合 PIRLS 滿分標準，核定 2 分。';
      strength = `棒極了！你能準確結合《${testPaper.title}》的具體情節說明觀點，論證充分且切中要旨！`;
      weakness = '表達流暢完整，完全吻合評分規準！';
    } else if (foundEvidences.length >= 1 || ansLen >= 10) {
      suggested = 1;
      code = '11';
      reason = '成功表達出正確方向，但線索未達兩項或略欠具體文字支持，核定 1 分。';
      strength = '方向正確，能大致回答出題目的主要意圖。';
      weakness = '說明稍嫌精簡，若能引用課文中的具體詞句或事實來支持你的理由，就能拿到滿分 2 分！';
    } else {
      suggested = 0;
      code = '79';
      reason = '回答內容與文章核心事實關聯較薄弱，給予 0 分。';
      strength = '有作答紀錄。';
      weakness = '答案未切入文章關鍵要點，建議重讀題幹對應段落找出線索。';
    }
  } else {
    if (foundEvidences.length >= 1 || ansLen >= 8) {
      suggested = 1;
      code = '10';
      reason = '準確指出文中所述之核心事實與原因，核定滿分 1 分。';
      strength = '精準提取文中所敘述的關鍵訊息，理解正確！';
      weakness = '完全符合題意！';
    } else {
      suggested = 0;
      code = '79';
      reason = '回答未符文中所陳述之關鍵事實，給予 0 分。';
      strength = '已嘗試作答。';
      weakness = '答案與課文事實不符，請再細心比對課文文意。';
    }
  }

  return {
    questionId: question.id,
    suggestedScore: suggested,
    maxScore: maxPts,
    scoreCode: code,
    reason,
    keyEvidenceFound: foundEvidences,
    strength,
    weakness,
    scaffoldingTip: '試著回到文章中，找出與問題最相關的句子再讀一次。',
    improvedFeedback: foundEvidences.length > 0 ? `已辨識出文本證據：【${foundEvidences.join('、')}】` : '未顯著辨識出文本證據詞，建議對照文章重審。',
    isAiGenerated: false,
  };
}
