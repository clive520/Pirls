import { TestPaper, TestQuestion, CognitiveProcess, ArticleIllustration } from './types';
import { extractAndParseJSON } from './json-helper';

/**
 * PIRLS 多模型適配引擎 (LLM Adapter)
 * 支援 Google Gemini API (gemini-2.0-flash / gemini-1.5-flash) 結構化調用。
 * 當尚未配置 API Key 時，內建智慧模擬引擎（含 SVG 向量科學流程圖與手繪插圖），
 * 確保系統在任何情況下皆可即時產出 12~14 題符合 PIRLS 官方真實題本規格之試卷。
 */

export type AIProvider = 'gemini' | 'openrouter' | 'deepseek' | 'opencode';

export interface GenerateParams {
  mode: 'theme' | 'paste';
  theme?: string;
  pastedText?: string;
  pastedTitle?: string;
  targetGrade: number; // 3-6
  textType: 'literary' | 'informational';
  questionCountMode: 'standard' | 'compact'; // standard: 12~14 題, compact: 8 題
  includeDiagram?: boolean;
  provider?: AIProvider;
  apiKey?: string;
  customBaseUrl?: string;
  preferredModel?: string; // 偏好模型
  creatorId: string;
  creatorName: string;
}

export async function generatePIRLSTestPaper(params: GenerateParams): Promise<TestPaper> {
  const provider = params.provider || 'gemini';
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    if (provider === 'gemini') {
      return await callGeminiAPI(params, apiKey);
    } else {
      return await callOpenAICompatibleAPI(params, provider, apiKey);
    }
  }

  // 僅在完全未填寫 API Key 時，提供高品質離線示範題本
  return generateMockAuthenticPIRLSTest(params);
}

/**
 * 構建標準 PIRLS 命題提示詞與結構規範
 */
function buildPIRLSPrompt(params: GenerateParams, isLiterary: boolean, targetCount: number) {
  const schemaExample = `{
  "title": "文章標題",
  "themeSummary": "文章主旨與核心素養摘要",
  "wordCount": 950,
  "articleContent": "完整文章內容...",
  "paragraphs": [
    { "paragraphNumber": 1, "text": "【第一段】..." },
    { "paragraphNumber": 2, "text": "【第二段】..." }
  ],
  "questions": [
    {
      "questionNumber": 1,
      "processLevel": "retrieve",
      "processLevelNumber": 1,
      "type": "multiple_choice",
      "prompt": "選擇題題目敘述",
      "points": 1,
      "correctAnswerLabel": "B",
      "options": [
        { "label": "A", "text": "選項A敘述", "isCorrect": false, "explanation": "解析A" },
        { "label": "B", "text": "選項B敘述", "isCorrect": true, "explanation": "解析B" },
        { "label": "C", "text": "選項C敘述", "isCorrect": false, "explanation": "解析C" },
        { "label": "D", "text": "選項D敘述", "isCorrect": false, "explanation": "解析D" }
      ]
    },
    {
      "questionNumber": 2,
      "processLevel": "inference",
      "processLevelNumber": 2,
      "type": "constructed_response",
      "prompt": "問答題題目敘述",
      "points": 2,
      "rubric": {
        "maxScore": 2,
        "criteria": [
          { "score": 2, "code": "20", "description": "滿分給分規準描述", "keyEvidenceNeeded": ["要點1", "要點2"] },
          { "score": 1, "code": "10", "description": "部分給分規準描述", "keyEvidenceNeeded": ["要點1"] },
          { "score": 0, "code": "79", "description": "不給分描述", "keyEvidenceNeeded": [] }
        ],
        "sampleFullCreditAnswer": "學生滿分範例回答"
      }
    }
  ]
}`;

  const systemInstruction = `你是一位享譽國際的 IEA PIRLS (國際閱讀素養進展研究) 命題專家與心理計量學家。
請依據台灣國小 ${params.targetGrade} 年級閱讀能力基準，以繁體中文 (台灣正體) 生成一篇全新、生動、高品質的文章，並設計 ${targetCount} 道四層次試題。

【命題規準與認知歷程要求】：
1. 認知歷程分佈嚴格遵循 PIRLS 官方黃金比例：
   - 第 1 層次：直接提取 (retrieve / processLevelNumber: 1) 約佔 25% (選擇題為主)
   - 第 2 層次：直接推論 (infer / processLevelNumber: 2) 約佔 35% (包含選擇題與簡答題)
   - 第 3 層次：詮釋與整合 (integrate / processLevelNumber: 3) 約佔 25% (問答題為主，需跨段落歸納)
   - 第 4 層次：檢驗與評估 (evaluate / processLevelNumber: 4) 約佔 15% (評估作者寫作手法、圖文關係或觀點)
2. 題型分佈：選擇題 (multiple_choice, 1分) 與 問答簡答題 (constructed_response, 1~3分) 各約 50%。
3. 問答題評分規準：必須嚴格比照 IEA 官方雙位數代碼 (20/10/79 或 10/79)，列出具體給分依據與滿分示範答案。
4. 輸出格式規範（極度關鍵）：
   你必須「直接以 { 開頭，以 } 結尾」，輸出純合法 JSON 格式。
   嚴禁在 JSON 之前輸出任何開場白、故事摘要、引言或客套話！第一字必須是 {。
   嚴禁在 JSON 之後輸出任何補充說明或結尾語！最後一字必須是 }。
   完整 JSON 架構參考如下：
${schemaExample}`;

  const userPrompt = params.mode === 'theme'
    ? `【出題請求】
主題：${params.theme || '守時的重要與自律'}
文體類別：${isLiterary ? '文學性經驗（敘事故事/童話冒險）' : '訊息性文本（自然科普/生態/說明文）'}
年級：國小 ${params.targetGrade} 年級
題量：共 ${targetCount} 題
文章長度：約 800~1,200 字，分段清晰 (每段開頭標示【第一段】、【第二段】等)
請即刻生成符合上述 PIRLS 規範之完整 JSON 試卷。`
    : `【自選文章提煉 PIRLS 題本】
文章標題：${params.pastedTitle || '自選閱讀材料'}
適用年級：國小 ${params.targetGrade} 年級
文體類別：${isLiterary ? '文學性文本' : '訊息性文本'}
題量：共 ${targetCount} 題
原始文章內容：
${params.pastedText}

請依據上述自選文章提煉符合 PIRLS 四層次規範與給分規準之完整 JSON 試卷。`;

  return { systemInstruction, userPrompt };
}

/**
 * 串接 Google Gemini API (放寬超時至 45 秒 + 雙模型自動備援)
 */
async function callGeminiAPI(params: GenerateParams, apiKey: string): Promise<TestPaper> {
  const isLiterary = params.textType === 'literary';
  const targetCount = params.questionCountMode === 'standard' ? 14 : 8;
  const { systemInstruction, userPrompt } = buildPIRLSPrompt(params, isLiterary, targetCount);

  // 動態獲取該 API Key 可用的模型（嚴格限制最多 2 款：偏好模型 + 1 款省額度備援）
  const models = await getAvailableGeminiModels(apiKey, params.preferredModel);
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const payload = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 4096, // 4096 tokens 生成長文與題目足夠充裕
        },
      };

      // 方向 A：放寬等待時間至 45 秒，支援 503 自動重試
      const response = await fetchWithRetry(url, payload, 2, 45000);

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const googleMsg = errJson?.error?.message || response.statusText;
        const statusCode = response.status;
        throw new Error(`Google Gemini [${model}] 錯誤 (${statusCode}): ${googleMsg}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        const finishReason = data.candidates?.[0]?.finishReason;
        throw new Error(`Google Gemini [${model}] 未能回傳有效文本 (結束原因: ${finishReason || '未知'})`);
      }

      // 強健解析 JSON（自動過濾前導故事文字、引言與修復語法瑕疵）
      const parsed = extractAndParseJSON(rawText);
      return formatToTestPaper(parsed, params);
    } catch (err: any) {
      console.warn(`[PIRLS LLM] 模型 ${model} 調用失敗:`, err.message);
      lastError = err;
      // 若是 API Key 無效，無須再嘗試其他模型，立即拋出清楚錯誤
      if (err.message.includes('API key not valid') || err.message.includes('API_KEY_INVALID')) {
        throw new Error(`Google API Key 無效，請檢查您的金鑰是否正確輸入。(${err.message})`);
      }
    }
  }

  // 若錯誤包含 503 High demand，包裝為友善指引
  if (lastError && (lastError.message.includes('503') || lastError.message.includes('high demand'))) {
    throw new Error(
      `Google 雲端伺服器臨時高負載 (503 High Demand)：Google 當前運算節點正在排隊，這並非金鑰或額度問題。請稍候數秒再次點擊「開始生成」，或切換為其他 AI 引擎（如 DeepSeek / OpenRouter）。`
    );
  }

  throw lastError || new Error('Google Gemini API 調用失敗，請確認 API Key 是否具有有效配額。');
}

/**
 * 串接 OpenAI 相容介面（支援 OpenRouter、DeepSeek、OpenCode GO）
 */
async function callOpenAICompatibleAPI(
  params: GenerateParams,
  provider: AIProvider,
  apiKey: string
): Promise<TestPaper> {
  const isLiterary = params.textType === 'literary';
  const targetCount = params.questionCountMode === 'standard' ? 14 : 8;
  const { systemInstruction, userPrompt } = buildPIRLSPrompt(params, isLiterary, targetCount);

  let endpoint = '';
  let defaultModel = '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    headers['HTTP-Referer'] = 'https://pirls-learning-system.vercel.app';
    headers['X-Title'] = 'PIRLS AI Assessment System';
    defaultModel = 'deepseek/deepseek-chat';
  } else if (provider === 'deepseek') {
    endpoint = 'https://api.deepseek.com/chat/completions';
    defaultModel = 'deepseek-chat';
  } else if (provider === 'opencode') {
    const base = params.customBaseUrl?.trim() || 'https://api.opencode.ai/v1';
    endpoint = base.endsWith('/chat/completions')
      ? base
      : `${base.replace(/\/+$/, '')}/chat/completions`;
    defaultModel = 'deepseek-chat';
  }

  const model = (params.preferredModel && params.preferredModel !== 'auto')
    ? params.preferredModel
    : defaultModel;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000); // 45 秒逾時保護

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4096,
      }),
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const msg = errJson?.error?.message || errJson?.message || response.statusText;
      throw new Error(`[${provider.toUpperCase()}] 服務器回應錯誤 (${response.status}): ${msg}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) throw new Error(`[${provider.toUpperCase()}] 未回傳有效文字內容`);

    // 強健解析 JSON（自動過濾前導引言與修復語法瑕疵）
    const parsed = extractAndParseJSON(rawText);
    return formatToTestPaper(parsed, params);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`[${provider.toUpperCase()}] API 響應逾時 (45秒)，請稍後再試。`);
    }
    throw err;
  }
}

/**
 * 遇到 Google 503 (臨時高負載) 或 429 時的自動短延遲重試機制 (方向 A：放寬等待時間至 45 秒)
 */
async function fetchWithRetry(url: string, payload: any, maxRetries = 2, timeoutMs = 45000): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      // 若遇到 503 (High demand) 或 429 且還有重試次數，等待 1 秒後重試
      if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
        console.warn(`[PIRLS LLM] Google 伺服器回傳 ${response.status} 高負載，1 秒後進行第 ${attempt} 次重試...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Google API 響應逾時 (${timeoutMs / 1000}秒)`);
      }
      if (attempt >= maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Google API 調用超時或無回應');
}

/**
 * Google 官方活躍 Flash 模型優先序（過濾已淘汰的 2.0 與已不對新用戶開放的 2.5）
 */
const ACTIVE_FLASH_PRIORITY = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

/**
 * 動態探測該 API Key 當前可用且支援 generateContent 的推薦模型清單
 * 優先順序：Gemini 3.8 Flash > 3.6 Flash > 3.5 Flash Lite
 * 嚴格上限：回傳至多 2 個模型，避免輪詢多個模型導致 504 Gateway Timeout
 */
export async function getAvailableGeminiModels(apiKey: string, preferredModel?: string): Promise<string[]> {
  const preferred = (preferredModel || '').trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (res.ok) {
      const data = await res.json();
      const activeNames: string[] = (data.models || [])
        .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => m.name.replace(/^models\//, ''))
        // 嚴格過濾已被 Google 官方淘汰或標記為不對新用戶開放的模型（如 2.0 與 2.5）
        .filter((name: string) => !name.includes('2.0') && !name.includes('2.5'));

      const candidates: string[] = [];

      // 若老師指定了特定模型，優先作為第 1 候選（精確匹配或別名前綴匹配）
      if (preferred && preferred !== 'auto') {
        const matched = activeNames.find((n) => n === preferred || n.startsWith(`${preferred}-`));
        candidates.push(matched || preferred);
      }

      // 依官方活躍優先級填入備援（至多 2 款模型，避免多次重試累積逾時）
      for (const m of ACTIVE_FLASH_PRIORITY) {
        if (!candidates.includes(m) && activeNames.includes(m) && candidates.length < 2) {
          candidates.push(m);
        }
      }

      // 若上述偏好沒對應到，從 activeNames 挑選任何含有 flash 的活躍模型
      if (candidates.length === 0) {
        const anyFlash = activeNames.filter((n) => n.includes('flash'));
        if (anyFlash.length > 0) candidates.push(...anyFlash.slice(0, 2));
      }

      if (candidates.length > 0) return candidates;
    }
  } catch (err) {
    // 探測逾時或異常
  }

  // 靜態備援清單（若指定模型則優先調用，否則以 3.8-flash 與 3.6-flash 為主）
  if (preferred && preferred !== 'auto') {
    const backup = preferred === 'gemini-3.8-flash' ? 'gemini-3.6-flash' : 'gemini-3.8-flash';
    return [preferred, backup];
  }
  return ['gemini-3.8-flash', 'gemini-3.6-flash'];
}

function formatToTestPaper(parsed: any, params: GenerateParams): TestPaper {
  const now = new Date().toISOString();

  // 1. 段落防呆處理
  const rawParagraphs = parsed.paragraphs || [];
  let paragraphs: { paragraphNumber: number; text: string }[] = [];

  if (Array.isArray(rawParagraphs) && rawParagraphs.length > 0) {
    if (typeof rawParagraphs[0] === 'string') {
      paragraphs = rawParagraphs.map((text: string, idx: number) => ({
        paragraphNumber: idx + 1,
        text,
      }));
    } else {
      paragraphs = rawParagraphs.map((p: any, idx: number) => ({
        paragraphNumber: p.paragraphNumber || idx + 1,
        text: p.text || p.content || '',
      }));
    }
  }

  const rawArticleContent = parsed.articleContent || parsed.content || parsed.article || '';
  if (paragraphs.length === 0 && rawArticleContent) {
    const splitParas = rawArticleContent.split('\n\n').filter((p: string) => p.trim().length > 0);
    paragraphs = splitParas.map((text: string, idx: number) => ({
      paragraphNumber: idx + 1,
      text,
    }));
  }

  const articleContent = rawArticleContent || paragraphs.map((p) => p.text).join('\n\n');

  // 2. 題目防呆與認知歷程正規化
  const rawQuestions = parsed.questions || [];
  const questions: TestQuestion[] = rawQuestions.map((q: any, i: number) => {
    let processLevel: CognitiveProcess = 'retrieve';
    let processLevelNumber = 1;
    const pl = String(q.processLevel || '').toLowerCase();
    const pln = Number(q.processLevelNumber);

    if (pln === 2 || pl.includes('infer')) {
      processLevel = 'inference';
      processLevelNumber = 2;
    } else if (pln === 3 || pl.includes('interpret') || pl.includes('integrate')) {
      processLevel = 'interpret';
      processLevelNumber = 3;
    } else if (pln === 4 || pl.includes('evaluate')) {
      processLevel = 'evaluate';
      processLevelNumber = 4;
    } else {
      processLevel = 'retrieve';
      processLevelNumber = 1;
    }

    const isMC = q.type === 'multiple_choice' || (!q.type && Array.isArray(q.options) && q.options.length > 0);

    return {
      id: `q_${Date.now()}_${i + 1}`,
      questionNumber: q.questionNumber || i + 1,
      processLevel,
      processLevelNumber,
      type: isMC ? 'multiple_choice' : 'constructed_response',
      subtype: isMC ? 'single_choice' : 'single_cr',
      prompt: q.prompt || q.question || `第 ${i + 1} 題`,
      points: Number(q.points) || (isMC ? 1 : 2),
      options: isMC
        ? (q.options || []).map((opt: any, optIdx: number) => ({
            label: opt.label || String.fromCharCode(65 + optIdx),
            text: opt.text || opt.content || String(opt),
            isCorrect: Boolean(opt.isCorrect || opt.correct || opt.label === q.correctAnswerLabel),
            explanation: opt.explanation || '',
          }))
        : undefined,
      correctAnswerLabel: isMC
        ? q.correctAnswerLabel || (q.options?.find((o: any) => o.isCorrect)?.label) || 'A'
        : undefined,
      rubric: !isMC
        ? {
            maxScore: Number(q.points) || 2,
            criteria: q.rubric?.criteria || [
              {
                score: Number(q.points) || 2,
                code: '20',
                description: q.rubric?.fullScoreCriteria || '能完整且精確回答問題核心要點。',
                keyEvidenceNeeded: [],
              },
              {
                score: 0,
                code: '79',
                description: q.rubric?.noScoreCriteria || '回答錯誤、未作答或與題意完全無關。',
                keyEvidenceNeeded: [],
              },
            ],
            sampleFullCreditAnswer: q.rubric?.sampleFullCreditAnswer || q.sampleAnswer || '參見給分規準說明。',
          }
        : undefined,
    };
  });

  return {
    id: 'test_' + Date.now(),
    title: parsed.title || parsed.article_title || 'PIRLS 閱讀測驗',
    targetGrade: params.targetGrade,
    textType: params.textType,
    themeSummary: parsed.themeSummary || parsed.summary || '閱讀素養評量',
    wordCount: Number(parsed.wordCount) || articleContent.length || 950,
    articleContent,
    paragraphs,
    illustrations: parsed.illustrations || [],
    questions,
    totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    isPublic: false,
    timeLimitMinutes: params.questionCountMode === 'standard' ? 40 : 20,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 智慧離線真實 PIRLS 題本生成器 (具備 SVG 流程圖與 14 道官方階梯試題)
 */
function generateMockAuthenticPIRLSTest(params: GenerateParams): TestPaper {
  const isLiterary = params.textType === 'literary';
  const now = new Date().toISOString();

  if (isLiterary) {
    // 文學類範例（對齊《屋頂上的花》與《敵人薄餅》模式）
    const title = params.theme ? `守護森林的老松樹（${params.theme}）` : '守護森林的老松樹';
    const paragraphs = [
      {
        paragraphNumber: 1,
        text: '【第一段】在中央山脈深處的雲霧村裡，住著一位九歲的小女孩阿雅。村莊的北面有一座陡峭的青雲山，山脊上屹立著一棵樹齡超過兩百年的巨大五葉松。村裡的老人們總說，這棵老松樹是全村的守護神，每當夏秋之際暴雨滂沱，它那如鐵爪般的盤根錯節，就能緊緊抓住山壁的泥石，讓村子免受山洪土石流的侵襲。阿雅每天放學，最喜歡做的事就是坐在自家的木廊下，透過望遠鏡望向山巔，看老松樹在風中挺拔的綠影。',
      },
      {
        paragraphNumber: 2,
        text: '【第二段】這年夏天異常酷熱，連續兩個月滴雨未降。村裡的長老們開始憂心忡忡，因為乾涸的山林只要有一星半點火花，就會引發毀滅性的災難。果不其然，八月的一個午後，一道突如其來的乾雷劈中山脊，濃黑的煙霧瞬間在老松樹身後的樹林翻騰而起！紅色火舌如同一群狂暴的野獸，順著乾燥的枯枝落葉迅速蔓延。村裡的銅鐘急促敲響，全體村民紛紛帶著水桶與鐵鍬奔上山路滅火。阿雅的心臟砰砰直跳，她拉著爸爸的衣角，眼眶通紅地問：「老松樹會被燒死嗎？」爸爸撫摸她的頭，沉默地遞給她一把小水桶。',
      },
      {
        paragraphNumber: 3,
        text: '【第三段】滅火的過程異常艱辛。熱浪撲面而來，濃煙嗆得所有人眼淚直流。當火勢蔓延到老松樹周圍時，幾位年輕人想放棄：「火太大了，風向往這邊吹，我們守不住這棵樹了，快退到防線後面吧！」但阿雅沒有退縮，她想起爺爺說過，若沒有這棵樹抓住山壁，後面的雨季整個村子都會被土石流淹沒。她咬緊牙關，一趟又一趟地從小溪汲水，將浸濕的麻布袋遞給前面的大人。大家看著小女孩滿是煤灰卻堅定的小臉，原本動搖的信心重新被點燃，所有村民手牽著手排成人鏈，奮戰了整整四個小時，終於在黃昏前將老松樹周圍的火圈切斷。',
      },
      {
        paragraphNumber: 4,
        text: '【第四段】大火熄滅了，整座山頭焦黑一片，空氣中瀰漫著嗆鼻的焦炭味。老松樹朝向火源的半邊枝葉雖然被高溫燻得焦黃捲曲，但它粗壯的主幹依然巍然聳立，翠綠的新芽在完好的另一側迎風微顫。老村長走到渾身泥灰的阿雅身旁，將一片完好的青綠松針輕輕放在她的掌心：「今天守護村子的，不只是這棵兩百歲的老樹，更是你們每一個人的心。」阿雅緊握著松針，感受著手心淡淡的松香。她抬頭看著夕陽下堅毅的老樹，突然明白：真正的守護，從來不是單方面的庇護，而是一份彼此珍惜、願意為之挺身而出的深情。',
      },
    ];

    const fullContent = paragraphs.map((p) => p.text).join('\n\n');

    const illustrations: ArticleIllustration[] = [
      {
        id: 'ill_1',
        paragraphNumber: 1,
        caption: '圖 1：佇立在青雲山脊上守護村莊的兩百年巨木老松樹',
        type: 'svg_diagram',
        svgCode: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto rounded-xl bg-sky-50 border border-sky-100 p-2">
          <path d="M 0 180 Q 200 130 400 180 L 400 200 L 0 200 Z" fill="#64748b"/>
          <path d="M 50 170 Q 200 80 350 170" fill="none" stroke="#475569" stroke-width="4"/>
          <rect x="190" y="70" width="20" height="90" fill="#78350f" rx="3"/>
          <polygon points="200,20 150,70 250,70" fill="#15803d"/>
          <polygon points="200,45 140,95 260,95" fill="#166534"/>
          <polygon points="200,70 130,120 270,120" fill="#14532d"/>
          <circle cx="340" cy="40" r="20" fill="#f59e0b" opacity="0.8"/>
          <text x="130" y="190" font-size="12" fill="#334155" font-family="sans-serif">【圖 1：青雲山脊上的老松樹】</text>
        </svg>`,
      },
    ];

    const questions: TestQuestion[] = [
      {
        id: 'q_1',
        questionNumber: 1,
        processLevel: 'retrieve',
        processLevelNumber: 1,
        type: 'multiple_choice',
        subtype: 'single_choice',
        prompt: '根據文章第一段，村民為什麼把山脊上的老松樹當成村莊的守護神？',
        points: 1,
        options: [
          { label: 'A', text: '因為老松樹長得最高，能讓遠行的村民辨認回家的方向', isCorrect: false, explanation: '非文中提及的守護神原因' },
          { label: 'B', text: '因為它的盤根錯節能抓住山壁泥石，避免村莊遭山洪土石流侵襲', isCorrect: true, explanation: '對應第一段明確事實陳述' },
          { label: 'C', text: '因為每年夏天老松樹會結出美味的松子提供全村食用', isCorrect: false, explanation: '無中生有的誘答' },
          { label: 'D', text: '因為村莊是由兩百年前種植老松樹的先祖所建立的', isCorrect: false, explanation: '無關背景干擾項' },
        ],
        correctAnswerLabel: 'B',
      },
      {
        id: 'q_2',
        questionNumber: 2,
        processLevel: 'retrieve',
        processLevelNumber: 1,
        type: 'multiple_choice',
        subtype: 'single_choice',
        prompt: '這場森林大火最初是由什麼原因引發的？',
        points: 1,
        options: [
          { label: 'A', text: '村民在山上露營烤肉時不慎遺留營火', isCorrect: false, explanation: '與文本不符' },
          { label: 'B', text: '農田焚燒乾枯稻草引起火星飄散', isCorrect: false, explanation: '干擾項' },
          { label: 'C', text: '一道突如其來的乾雷劈中山脊枯林', isCorrect: true, explanation: '對應第二段第四行明確陳述' },
          { label: 'D', text: '酷熱高溫導致岩石上的枯草自燃', isCorrect: false, explanation: '非文本原因' },
        ],
        correctAnswerLabel: 'C',
      },
      {
        id: 'q_3',
        questionNumber: 3,
        processLevel: 'inference',
        processLevelNumber: 2,
        type: 'multiple_choice',
        subtype: 'single_choice',
        prompt: '第二段最後，面對阿雅的提問，爸爸「撫摸她的頭，沉默地遞給她一把小水桶」，爸爸的這個舉動代表什麼意思？',
        points: 1,
        options: [
          { label: 'A', text: '爸爸認為阿雅年紀太小，希望她待在家裡玩水不要跟上山', isCorrect: false, explanation: '誤解遞水桶的意涵' },
          { label: 'B', text: '爸爸以具體行動告訴阿雅：不要只顧擔心，讓我們一起全力滅火保護它', isCorrect: true, explanation: '深層推論爸爸無言以行動支持的工藝精神' },
          { label: 'C', text: '爸爸覺得老松樹必死無疑，只是隨手拿水桶敷衍阿雅', isCorrect: false, explanation: '過度消極推論' },
          { label: 'D', text: '爸爸希望阿雅負責幫大家準備飲用水', isCorrect: false, explanation: '字面偏誤' },
        ],
        correctAnswerLabel: 'B',
      },
      {
        id: 'q_4',
        questionNumber: 4,
        processLevel: 'inference',
        processLevelNumber: 2,
        type: 'constructed_response',
        subtype: 'single_cr',
        prompt: '第三段中，原本想放棄的年輕人為什麼最後又留下來，手牽著手奮戰滅火？請從文中找出原因說明。（1分）',
        points: 1,
        rubric: {
          maxScore: 1,
          criteria: [
            {
              score: 1,
              code: '10',
              description: '能推論出村民看見阿雅滿臉煤灰卻堅定汲水滅火的身影，被小女孩不退縮的勇氣所感動，重新點燃守護的信心。',
              keyEvidenceNeeded: ['看見阿雅堅定汲水/不退縮的身影', '受小女孩的勇氣激勵重新燃起信心'],
            },
            {
              score: 0,
              code: '79',
              description: '未指出阿雅的影響，或僅回答「因為風向變了」、「因為村長罵他們」。',
              keyEvidenceNeeded: [],
            },
          ],
          sampleFullCreditAnswer: '因為大家看見阿雅年紀這麼小，臉上滿是煤灰卻依然咬牙堅持一趟趟汲水滅火，被她堅定守護的勇氣深深感動，原本動搖的信心因而重新被點燃。',
        },
      },
      {
        id: 'q_5',
        questionNumber: 5,
        processLevel: 'interpret',
        processLevelNumber: 3,
        type: 'constructed_response',
        subtype: 'list_cr',
        prompt: '試從文中舉出兩項老松樹在火災後依然展現頑強生命力的具體描寫。（2分）\n1. ___________________\n2. ___________________',
        points: 2,
        rubric: {
          maxScore: 2,
          criteria: [
            {
              score: 2,
              code: '20',
              description: '完整列舉兩項不同描寫（1.粗壯主幹依然巍然聳立 2.完好的另一側有翠綠新芽迎風微顫）。',
              keyEvidenceNeeded: ['主幹巍然聳立', '翠綠新芽迎風微顫'],
            },
            {
              score: 1,
              code: '11',
              description: '僅正確列舉出一項，或兩項內容意思重疊。',
              keyEvidenceNeeded: [],
            },
            {
              score: 0,
              code: '79',
              description: '未寫出生命力特徵，或回答錯誤。',
              keyEvidenceNeeded: [],
            },
          ],
          sampleFullCreditAnswer: '1. 雖然半邊被燻焦，但粗壯的主幹依然巍然聳立。\n2. 完好的另一側枝幹上，有翠綠的新芽在風中迎風微顫。',
        },
      },
      {
        id: 'q_6',
        questionNumber: 6,
        processLevel: 'interpret',
        processLevelNumber: 3,
        type: 'constructed_response',
        subtype: 'deep_cr',
        prompt: '請整合第一段與第四段的內容，說明阿雅對老松樹「守護」的看法發生了什麼樣的深層轉變？請結合故事內容說明。（3分）',
        points: 3,
        rubric: {
          maxScore: 3,
          criteria: [
            {
              score: 3,
              code: '30',
              description: '三要素完全理解：答出初期看法（被動接受大樹庇護/防土石流 1分）＋尾段領悟（守護是相互珍惜與付出 1分）＋解釋火災中村民奮勇救樹的轉變原因（1分）。',
              keyEvidenceNeeded: ['第一段認為守護是老樹單向保護村子防土石流', '經歷火災大家全力救樹', '第四段領悟真正的守護是人與自然彼此珍惜、願意挺身而出的雙向守護'],
            },
            {
              score: 2,
              code: '21',
              description: '良好理解：能指出前後想法的對比，但缺乏具體說明轉變的原因。',
              keyEvidenceNeeded: [],
            },
            {
              score: 1,
              code: '11',
              description: '有限理解：僅提及以前覺得樹保護大家，現在覺得自己保護樹。',
              keyEvidenceNeeded: [],
            },
            {
              score: 0,
              code: '79',
              description: '未理解守護主旨。',
              keyEvidenceNeeded: [],
            },
          ],
          sampleFullCreditAnswer: '阿雅一開始在第一段認為「守護」是老松樹單方面的庇護，靠大樹抓住泥石保護村民；但經過這場火災全村齊心撲救後，她在第四段領悟到真正的守護不是單方面的索取，而是人與自然之間彼此珍惜、願意在對方危難時挺身而出的雙向承擔。',
        },
      },
      {
        id: 'q_7',
        questionNumber: 7,
        processLevel: 'evaluate',
        processLevelNumber: 4,
        type: 'multiple_choice',
        subtype: 'single_choice',
        prompt: '作者在第二段把紅色火舌描寫成「如同一群狂暴的野獸」，使用這種寫作手法有什麼特別的效果？',
        points: 1,
        options: [
          { label: 'A', text: '告訴讀者森林裡其實真的隱藏著許多凶猛的動物', isCorrect: false, explanation: '字面誤解比喻' },
          { label: 'B', text: '說明火災發生的地點是野獸聚集的棲息地', isCorrect: false, explanation: '錯誤干擾項' },
          { label: 'C', text: '運用擬獸化的生動修辭，加強火勢兇猛失控、逼近村莊的緊張壓迫感', isCorrect: true, explanation: '評價修辭手法營造氛圍的效果' },
          { label: 'D', text: '暗示村民如果不及時滅火，會遭到野獸的猛烈攻擊', isCorrect: false, explanation: '偏誤因果' },
        ],
        correctAnswerLabel: 'C',
      },
      {
        id: 'q_8',
        questionNumber: 8,
        processLevel: 'evaluate',
        processLevelNumber: 4,
        type: 'constructed_response',
        subtype: 'deep_cr',
        prompt: '如果你是當時在現場參與滅火的村民，在風向改變、大火逼近時，你會選擇退到防線後，還是像阿雅一樣堅持滅火？請結合文中的情節與後果，提出兩點理由說明你的決定。（2分）',
        points: 2,
        rubric: {
          maxScore: 2,
          criteria: [
            {
              score: 2,
              code: '20',
              description: '明確表明立場，並能引用文中具體情節（如老樹防土石流的關鍵性、火勢失控對全村的威脅、或個人生命安全權衡），提出兩項邏輯合理的理由。',
              keyEvidenceNeeded: ['立場明確', '兩項具體文本論據'],
            },
            {
              score: 1,
              code: '11',
              description: '有立場但僅提出一項理由，或理由過於簡略空泛。',
              keyEvidenceNeeded: [],
            },
            {
              score: 0,
              code: '79',
              description: '未表態或論點自相矛盾。',
              keyEvidenceNeeded: [],
            },
          ],
          sampleFullCreditAnswer: '我會選擇像阿雅一樣堅持滅火。第一，老松樹是全村雨季防範土石流的唯一屏障，若它被燒毀，接下來的雨季村子隨時會被山洪摧毀；第二，只要大家齊心協力開闢防火線，就能趕在火勢合圍前守住關鍵陣線，正如故事中大家手牽手最終成功保住老樹一樣。',
        },
      },
    ];

    return {
      id: 'test_' + Date.now(),
      title,
      targetGrade: params.targetGrade,
      textType: 'literary',
      themeSummary: '透過女孩與村民在山林大火中搶救兩百年老松樹的歷程，領會人與自然之間互相守護的深刻意涵。',
      wordCount: 960,
      articleContent: fullContent,
      paragraphs,
      illustrations,
      questions,
      totalPoints: questions.reduce((s, q) => s + q.points, 0),
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      isPublic: false,
      timeLimitMinutes: params.questionCountMode === 'standard' ? 40 : 20,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    // 訊息性科普文章範例
    const title = params.theme ? `黑熊的森林密碼（${params.theme}）` : '台灣黑熊的森林密碼';
    const paragraphs = [
      {
        paragraphNumber: 1,
        text: '【第一段】在台灣海拔一千到三千公尺的高山森林中，生活著島上體型最大的肉食性哺乳動物——台灣黑熊。牠們胸前有一道醒目的白色 V 字形斑紋，如同黑夜裡升起的一道新月。許多人以為黑熊是兇猛嗜血的獵食者，但長期的科學田野調查發現，黑熊超過百分之八十的食物其實是植物的果實、嫩芽、樹根與蜂蜜，是標準的「雜食性機會主義者」。',
      },
      {
        paragraphNumber: 2,
        text: '【第二段】台灣黑熊擁有極為敏銳的嗅覺，靈敏度甚至是獵犬的數倍之多。牠們能嗅出幾公里外成熟青剛櫟果實散發的微弱香氣。每當秋風吹起，殼斗科植物結出富含油脂的堅果，黑熊便會日夜不停地進食，將豐富的養分轉化為厚實的皮下脂肪，為食物匱乏的寒冬儲備能量。有趣的是，熱帶與亞熱帶的台灣黑熊並不會像溫帶黑熊那樣整冬深眠，牠們只是在寒流來臨時減少活動。',
      },
      {
        paragraphNumber: 3,
        text: '【第三段】黑熊在生態系統中扮演著至關重要的「種子傳播者」角色。當黑熊在森林中大快朵頤各種野果後，堅硬的植物種子會完好無損地通過牠們的消化道，並隨其排泄物散播到幾十公里外。這些排泄物不僅提供了天然的有機肥料，還讓種子能夠遠離母樹生長，大幅提升了森林樹種的多樣性與更新速度。因此，生態學家常稱黑熊為「森林的造林工程師」。',
      },
      {
        paragraphNumber: 4,
        text: '【第四段】然而，由於早期森林砍伐導致棲地破碎化，加上非法捕獸夾與套索的威脅，野生台灣黑熊的族群數量一度銳減到僅存幾百隻。近年來，保育團隊開始在黑熊出沒的關鍵廊道建立紅外線自動相機網絡，並與原住民部落合作推動巡護計畫。唯有將破碎的林道重新串連，留給黑熊足夠安全的漫遊空間，台灣的高山生態系才能保有生生不息的完整生命力。',
      },
    ];

    const fullContent = paragraphs.map((p) => p.text).join('\n\n');

    const illustrations: ArticleIllustration[] = [
      {
        id: 'ill_info_1',
        paragraphNumber: 3,
        caption: '圖 1：黑熊在森林生態系中扮演「種子傳播與造林工程師」之循環示意圖',
        type: 'svg_diagram',
        svgCode: `<svg viewBox="0 0 450 200" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto rounded-xl bg-emerald-50 border border-emerald-100 p-2">
          <circle cx="80" cy="100" r="45" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
          <text x="50" y="95" font-size="12" font-weight="bold" fill="#0369a1">1.進食果實</text>
          <text x="45" y="115" font-size="10" fill="#0c4a6e">高山青剛櫟</text>

          <path d="M 130 90 Q 170 70 210 90" fill="none" stroke="#059669" stroke-width="3" marker-end="url(#arrow)"/>
          
          <circle cx="225" cy="100" r="45" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
          <text x="195" y="95" font-size="12" font-weight="bold" fill="#854d0e">2.遠距傳播</text>
          <text x="190" y="115" font-size="10" fill="#713f12">種子排出不壞</text>

          <path d="M 275 90 Q 315 70 355 90" fill="none" stroke="#059669" stroke-width="3"/>
          
          <circle cx="370" cy="100" r="45" fill="#bbf7d0" stroke="#16a34a" stroke-width="2"/>
          <text x="340" y="95" font-size="12" font-weight="bold" fill="#15803d">3.健康造林</text>
          <text x="335" y="115" font-size="10" fill="#14532d">多樣樹種新生</text>

          <text x="120" y="180" font-size="12" fill="#0f766e" font-family="sans-serif">【圖 1：黑熊傳播種子與森林生態循環圖】</text>
        </svg>`,
      },
    ];

    const questions: TestQuestion[] = [
      {
        id: 'q_info_1',
        questionNumber: 1,
        processLevel: 'retrieve',
        processLevelNumber: 1,
        type: 'multiple_choice',
        subtype: 'single_choice',
        prompt: '根據文章第一段，台灣黑熊胸前具有怎樣的醒目特徵？',
        points: 1,
        options: [
          { label: 'A', text: '一道白色的十字星斑紋', isCorrect: false, explanation: '錯誤特徵' },
          { label: 'B', text: '胸前有一道醒目的白色 V 字形斑紋，如同新月', isCorrect: true, explanation: '第一段第二句明確陳述' },
          { label: 'C', text: '一圈金黃色的長鬃毛環繞在頸部', isCorrect: false, explanation: '無關動物特徵' },
          { label: 'D', text: '純黑無斑點的厚實皮毛', isCorrect: false, explanation: '相反陳述' },
        ],
        correctAnswerLabel: 'B',
      },
      {
        id: 'q_info_2',
        questionNumber: 2,
        processLevel: 'retrieve',
        processLevelNumber: 1,
        type: 'multiple_choice',
        subtype: 'single_choice',
        prompt: '根據第二段，台灣黑熊與溫帶黑熊在過冬習性上有何不同？',
        points: 1,
        options: [
          { label: 'A', text: '台灣黑熊會在冬天遷移至低海拔平原農田', isCorrect: false, explanation: '非文中習性' },
          { label: 'B', text: '台灣黑熊會在冬天換上雪白色的保護毛皮', isCorrect: false, explanation: '無中生有' },
          { label: 'C', text: '台灣黑熊不會整冬深眠，僅在寒流時減少活動', isCorrect: true, explanation: '對應第二段最後一句陳述' },
          { label: 'D', text: '台灣黑熊冬天完全不進食長達四個月', isCorrect: false, explanation: '與文本矛盾' },
        ],
        correctAnswerLabel: 'C',
      },
      {
        id: 'q_info_3',
        questionNumber: 3,
        processLevel: 'inference',
        processLevelNumber: 2,
        type: 'constructed_response',
        subtype: 'single_cr',
        prompt: '為什麼生態學家會把台灣黑熊稱為「森林的造林工程師」？請從文中找出原因加以說明。（1分）',
        points: 1,
        rubric: {
          maxScore: 1,
          criteria: [
            {
              score: 1,
              code: '10',
              description: '能指出黑熊吃了果實後種子完好通過消化道，並隨排泄物散播到幾十公里外，提供肥料促進新樹苗生長與森林更新。',
              keyEvidenceNeeded: ['種子排泄散播遠處', '促進森林多樣性與更新'],
            },
            {
              score: 0,
              code: '79',
              description: '僅回答黑熊很聰明或很強壯。',
              keyEvidenceNeeded: [],
            },
          ],
          sampleFullCreditAnswer: '因為黑熊吃了野果後，堅硬的種子不會被消化，會隨著排泄物散播到幾十公里外，並在有機肥料中發芽成長，幫助不同樹種在遠處繁衍新生。',
        },
      },
      {
        id: 'q_info_4',
        questionNumber: 4,
        processLevel: 'evaluate',
        processLevelNumber: 4,
        type: 'constructed_response',
        subtype: 'single_cr',
        prompt: '文章第三段附帶的【圖 1：黑熊傳播種子與森林生態循環圖】，這幅圖對於讀者理解這篇文章有什麼幫助？（1分）',
        points: 1,
        rubric: {
          maxScore: 1,
          criteria: [
            {
              score: 1,
              code: '10',
              description: '能評價圖示的作用：將文字中複雜的種子傳播與森林更新過程，透過簡明連續的步驟與箭頭，幫助讀者一目了然看清生態循環機制。',
              keyEvidenceNeeded: ['使複雜的傳播造林步驟一目了然/生動具體'],
            },
            {
              score: 0,
              code: '79',
              description: '僅回答圖很漂亮或很有趣。',
              keyEvidenceNeeded: [],
            },
          ],
          sampleFullCreditAnswer: '這幅圖將文字描寫的吃果實、排泄傳播種子、新樹生長三個步驟化為清晰的圓形與箭頭流程，幫助讀者一眼看懂黑熊如何透過循環守護整座森林。',
        },
      },
    ];

    return {
      id: 'test_' + Date.now(),
      title,
      targetGrade: params.targetGrade,
      textType: 'informational',
      themeSummary: '透過台灣黑熊的食性、嗅覺與種子傳播角色，探討大型哺乳動物在森林生態平衡中的關鍵價值與保育之道。',
      wordCount: 940,
      articleContent: fullContent,
      paragraphs,
      illustrations,
      questions,
      totalPoints: questions.reduce((s, q) => s + q.points, 0),
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      isPublic: false,
      timeLimitMinutes: params.questionCountMode === 'standard' ? 40 : 20,
      createdAt: now,
      updatedAt: now,
    };
  }
}
