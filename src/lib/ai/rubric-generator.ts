import { QuestionRubric, RubricCriteria } from '@/lib/types';
import { extractAndParseJSON } from '@/lib/json-helper';
import { getAvailableGeminiModels } from './providers/gemini';

export interface RegenerateRubricParams {
  articleTitle: string;
  articleContent: string;
  prompt: string;
  processLevel: string;
  processLevelNumber: number;
  targetGrade?: number;
  newPoints: number; // 1, 2, 3, 4, 5
  currentRubric?: QuestionRubric;
  provider?: string;
  apiKey?: string;
  customBaseUrl?: string;
  preferredModel?: string;
}

/**
 * 依據 IEA PIRLS 國際閱讀素養進展標準，重新生成階梯式給分規準 (Rubrics)
 */
export async function generateQuestionRubric(
  params: RegenerateRubricParams
): Promise<QuestionRubric> {
  const provider = params.provider || 'gemini';
  const apiKey = (params.apiKey || '').trim() || (provider === 'gemini' ? process.env.GEMINI_API_KEY?.trim() : undefined);

  if (apiKey) {
    try {
      if (provider === 'gemini') {
        return await callGeminiForRubric(params, apiKey);
      } else if (provider === 'claude') {
        return await callClaudeForRubric(params, apiKey);
      } else {
        return await callOpenAICompatibleForRubric(params, apiKey);
      }
    } catch (err) {
      console.warn('[RubricGenerator] AI 生成規準發生異常，自動切換至規則引擎備援:', err);
    }
  }

  // 備援智慧生成器（保證永不中斷）
  return fallbackGenerateRubric(params);
}

/**
 * 構建符合 IEA PIRLS 國際標準的 System Instruction 與 Prompt
 */
function buildRubricPrompts(params: RegenerateRubricParams) {
  const points = Math.max(1, Math.min(params.newPoints || 2, 5));
  const grade = params.targetGrade || 4;
  const levelText = `L${params.processLevelNumber} (${params.processLevel})`;

  const systemInstruction = `你是一位享譽國際的 IEA PIRLS (國際閱讀素養進展研究) 命題專家、閱卷委員會主席與心理計量學家。
你的任務是根據所提供的【文章內容】、【試題題幹】與【思維層次：${levelText}】，為國小 ${grade} 年級學生量身重構一套極其嚴謹、階梯分明的【IEA 官方給分規準 (Rubrics 指引)】。

【給分級別與滿分規範】：
- 本題滿分為：${points} 分。
- 給分級別必須從滿分 ${points} 分一路遞減至 0 分，共 ${points + 1} 個給分層次。
- IEA 官方雙位數代碼 (code) 嚴格遵循國際閱卷規範：
  * ${points} 分（滿分）：代碼為 "${points}0"（例如 3分題為 "30"，2分題為 "20"，1分題為 "10"）。達成條件：完整回答題幹核心、邏輯嚴密、並具備 ${points >= 2 ? points : 1} 項以上明確且充分的文本線索佐證。
  * 中間部分得分（若滿分 >= 2 分）：
    - 2 分（部分得分）：代碼為 "20" 或 "21"。達成條件：提出合理解釋或觀點，但文本證據僅有 1 項，或說明稍嫌簡略。
    - 1 分（基本得分）：代碼為 "10" 或 "11"。達成條件：僅能表面描述、提取單一事實，或理由不夠具體、未充分連結文本脈絡。
  * 0 分（未得分）：代碼為 "79"。達成條件：完全未回答、回答與文本無關、邏輯完全錯誤或純粹抄錄題目。
  * 空白/拒答代碼為 "99"。

【輸出格式強制規範】：
請直接輸出合法的 JSON 物件，嚴禁包含任何額外的問候語、前導說明或結語。
JSON 結構範例如下：
{
  "maxScore": ${points},
  "criteria": [
    ${points >= 3 ? `{"score": 3, "code": "30", "description": "【3分規準描述】完整深入說明...", "keyEvidenceNeeded": ["核心文本線索1", "核心文本線索2"]},\n    ` : ''}
    ${points >= 2 ? `{"score": 2, "code": "20", "description": "【2分規準描述】能具體說明...", "keyEvidenceNeeded": ["文本線索1"]},\n    ` : ''}
    {"score": 1, "code": "10", "description": "【1分規準描述】僅簡略說明或部分答對...", "keyEvidenceNeeded": ["基本線索"]},
    {"score": 0, "code": "79", "description": "【0分規準描述】未說明、回答與文本無關或答非所問。", "keyEvidenceNeeded": []}
  ],
  "sampleFullCreditAnswer": "符合國小 ${grade} 年級表達口吻但具備完整文本證據之滿分示範答案。",
  "samplePartialCreditAnswer": "部分得分之學生作答範例。"
}`;

  const userPrompt = `【文章資訊】
標題：《${params.articleTitle}》
文章全文：
${params.articleContent || '（無提供文章內容，請根據題幹脈絡推演）'}

【題目資訊】
思維層次：L${params.processLevelNumber} (${params.processLevel})
題幹 (Prompt)：${params.prompt}
當前配分：${points} 分

${params.currentRubric ? `【原本舊規準參考（舊配分：${params.currentRubric.maxScore} 分）】
${JSON.stringify(params.currentRubric, null, 2)}
` : ''}

請為這道題目重新生成一套完全適配【${points} 分】的全新 IEA PIRLS 給分規準 (Rubrics)。
請輸出合法的 JSON。`;

  return { systemInstruction, userPrompt, points };
}

/**
 * 調用 Google Gemini API 生成規準
 */
async function callGeminiForRubric(
  params: RegenerateRubricParams,
  apiKey: string
): Promise<QuestionRubric> {
  const { systemInstruction, userPrompt, points } = buildRubricPrompts(params);
  const models = await getAvailableGeminiModels(apiKey, params.preferredModel);

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: 'application/json',
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn(`[Gemini] model ${model} 回傳錯誤碼 ${res.status}`);
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = extractAndParseJSON<QuestionRubric>(rawText);
      if (validateRubric(parsed, points)) {
        return sanitizeRubric(parsed, points);
      }
    } catch (e) {
      console.warn(`[Gemini] model ${model} 調用失敗:`, e);
    }
  }

  throw new Error('Gemini API 未能產生有效 Rubric');
}

/**
 * 調用 Anthropic Claude API 生成規準
 */
async function callClaudeForRubric(
  params: RegenerateRubricParams,
  apiKey: string
): Promise<QuestionRubric> {
  const { systemInstruction, userPrompt, points } = buildRubricPrompts(params);
  const model = params.preferredModel && !params.preferredModel.includes('3-5')
    ? params.preferredModel
    : 'claude-sonnet-5-5';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0.2,
      system: systemInstruction,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API 回傳 ${res.status}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Claude API 未回傳內容');

  const parsed = extractAndParseJSON<QuestionRubric>(text);
  if (validateRubric(parsed, points)) {
    return sanitizeRubric(parsed, points);
  }

  throw new Error('Claude API 輸出的規準格式無效');
}

/**
 * 調用 OpenAI 相容 API (Groq, DeepSeek, OpenAI, etc.) 生成規準
 */
async function callOpenAICompatibleForRubric(
  params: RegenerateRubricParams,
  apiKey: string
): Promise<QuestionRubric> {
  const { systemInstruction, userPrompt, points } = buildRubricPrompts(params);
  const provider = params.provider || 'openai';

  let endpoint = 'https://api.openai.com/v1/chat/completions';
  let model = params.preferredModel || 'gpt-4o-mini';

  if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    model = params.preferredModel || 'openai/gpt-oss-120b';
  } else if (provider === 'deepseek') {
    endpoint = 'https://api.deepseek.com/chat/completions';
    model = params.preferredModel || 'deepseek-chat';
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    model = params.preferredModel || 'deepseek/deepseek-chat';
  } else if (provider === 'opencode' && params.customBaseUrl) {
    const base = params.customBaseUrl.replace(/\/+$/, '');
    endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    model = params.preferredModel || 'deepseek-chat';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI-compatible API 回傳 ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('API 未回傳內容');

  const parsed = extractAndParseJSON<QuestionRubric>(text);
  if (validateRubric(parsed, points)) {
    return sanitizeRubric(parsed, points);
  }

  throw new Error('輸出的規準格式無效');
}

/**
 * 驗證產生的規準是否完整
 */
function validateRubric(rubric: any, targetPoints: number): rubric is QuestionRubric {
  if (!rubric || typeof rubric !== 'object') return false;
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length < 2) return false;
  return true;
}

/**
 * 清洗並標準化規準，確保 criteria 涵蓋 0 到 points 分
 */
function sanitizeRubric(rubric: QuestionRubric, points: number): QuestionRubric {
  const maxScore = points;
  let criteria = rubric.criteria || [];

  // 確保分數由大到小排序
  criteria = criteria.sort((a, b) => b.score - a.score);

  // 確保最高分為 points
  if (criteria.length > 0 && criteria[0].score !== points) {
    criteria[0].score = points;
    criteria[0].code = `${points}0`;
  }

  // 確保包含 0 分
  const hasZero = criteria.some((c) => c.score === 0);
  if (!hasZero) {
    criteria.push({
      score: 0,
      code: '79',
      description: '未說明、回答與文本無關或答非所問。',
      keyEvidenceNeeded: [],
    });
  }

  return {
    maxScore,
    criteria: criteria.map((c) => ({
      score: Number(c.score),
      code: String(c.code || (c.score === 0 ? '79' : `${c.score}0`)),
      description: String(c.description || ''),
      keyEvidenceNeeded: Array.isArray(c.keyEvidenceNeeded) ? c.keyEvidenceNeeded.map(String) : [],
    })),
    sampleFullCreditAnswer: rubric.sampleFullCreditAnswer || '完整回答要點並提供文本佐證。',
    samplePartialCreditAnswer: rubric.samplePartialCreditAnswer,
  };
}

/**
 * 智慧備援規準生成器
 */
export function fallbackGenerateRubric(params: RegenerateRubricParams): QuestionRubric {
  const points = Math.max(1, Math.min(params.newPoints || 2, 5));
  const prompt = params.prompt || '開放簡答題';
  const criteria: RubricCriteria[] = [];

  if (points >= 3) {
    criteria.push({
      score: 3,
      code: '30',
      description: `能深入完整回答「${prompt.slice(0, 30)}...」，並提供 2 項以上具體且相符的文本線索與深層觀點論述。`,
      keyEvidenceNeeded: ['深層觀點或因果關聯', '至少兩處文本關鍵細節佐證'],
    });
    criteria.push({
      score: 2,
      code: '20',
      description: `能具體回答核心觀點，理由與文章內容相符，但僅附 1 項文本佐證或闡述稍欠完整。`,
      keyEvidenceNeeded: ['核心觀點闡述', '單項文本佐證'],
    });
    criteria.push({
      score: 1,
      code: '10',
      description: `能簡略回答或僅提及表面事實，理由不夠具體或未明確連結文本脈絡。`,
      keyEvidenceNeeded: ['表面事實提及'],
    });
    criteria.push({
      score: 0,
      code: '79',
      description: `未回答、回答不完整或內容與文章文本完全無關。`,
      keyEvidenceNeeded: [],
    });
  } else if (points === 2) {
    criteria.push({
      score: 2,
      code: '20',
      description: `能具體說明觀點或理由，並充分連結文章內容與關鍵事實。`,
      keyEvidenceNeeded: ['明確表達觀點', '引用文本具體佐證'],
    });
    criteria.push({
      score: 1,
      code: '10',
      description: `能簡略說明，但理由不夠具體或未完整連結文本內容。`,
      keyEvidenceNeeded: ['簡略說明'],
    });
    criteria.push({
      score: 0,
      code: '79',
      description: `未說明、回答與文本無關或答非所問。`,
      keyEvidenceNeeded: [],
    });
  } else {
    // 1 分題
    criteria.push({
      score: 1,
      code: '10',
      description: `能正確提取核心訊息或針對題幹要求做出合理解釋。`,
      keyEvidenceNeeded: ['核心要點'],
    });
    criteria.push({
      score: 0,
      code: '79',
      description: `回答錯誤、未作答或與文本無關。`,
      keyEvidenceNeeded: [],
    });
  }

  // 滿分示範答案
  let sampleAnswer = params.currentRubric?.sampleFullCreditAnswer || '';
  if (!sampleAnswer) {
    sampleAnswer = `針對題目要求，我認為...，因為文章中提到...，這說明了...。`;
  }

  return {
    maxScore: points,
    criteria,
    sampleFullCreditAnswer: sampleAnswer,
  };
}
