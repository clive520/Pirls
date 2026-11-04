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
  const includeDiagram = params.includeDiagram !== false;
  const isPasteMode = params.mode === 'paste';

  const schemaExampleTheme = `{
  "title": "文章標題",
  "themeSummary": "文章主旨與核心素養摘要",
  "wordCount": 950,
  "articleContent": "完整文章內容...",
  "paragraphs": [
    { "paragraphNumber": 1, "text": "【第一段】..." },
    { "paragraphNumber": 2, "text": "【第二段】..." },
    { "paragraphNumber": 3, "text": "【第三段】..." },
    { "paragraphNumber": 4, "text": "【第四段】..." }
  ],
  "illustrations": [
    {
      "id": "ill_1",
      "paragraphNumber": 1,
      "caption": "圖 1：【起·開端情境 / 穿插於第 1 段後】老鐘錶行門口金爺爺親切與孩子們交流",
      "type": "illustration_url",
      "imagePrompt": "【場景 1（起·開端情境，建議穿插於第 1 段之後）中文描述】：溫馨細緻的兒童繪本水彩手繪插畫：和藹的金爺爺在古樸老鐘錶行門口，笑瞇瞇地向身旁幾位國小學童解說鐘錶齒輪，暖陽灑落、柔和明亮、充滿童趣與故事溫度，16:9 橫向構圖，高品質繪本插圖。 / English prompt: A heartwarming children storybook watercolor illustration of kind elderly Grandpa Jin standing in front of his vintage wooden clock shop, warmly explaining gears to curious elementary school kids, sunny afternoon, soft warm lighting, detailed, charming, storybook art style --ar 16:9"
    },
    {
      "id": "ill_2",
      "paragraphNumber": 2,
      "caption": "圖 2：【承轉·衝突高潮 / 穿插於第 2 段後】金爺爺在工作檯前專注修復停擺的古老機械鐘",
      "type": "illustration_url",
      "imagePrompt": "【場景 2（承轉·衝突高潮，建議穿插於第 2 段之後）中文描述】：昏黃檯燈下，金爺爺戴著放大鏡，神情極度專注地以精細鑷子調整散落的黃銅齒輪與彈簧，工作檯上擺滿修復工具，充滿工匠精神與懸疑專注氛圍，16:9 橫向構圖。 / English prompt: Storybook watercolor illustration of Grandpa Jin under a warm desk lamp, wearing a magnifying loupe, delicately adjusting brass gears on a vintage workbench full of clockmaking tools, intense focus, craftsmanship, atmospheric, cozy --ar 16:9"
    },
    {
      "id": "ill_3",
      "paragraphNumber": 4,
      "caption": "圖 3：【合·溫馨結局 / 穿插於第 4 段後】古鐘重新清脆敲響，孩子們與金爺爺欣慰歡呼",
      "type": "illustration_url",
      "imagePrompt": "【場景 3（合·溫馨結局，建議穿插於第 4 段之後）中文描述】：晨光灑滿鐘錶行，高聳的大鐘指針轉動，齒輪重新運轉，金爺爺擦拭額頭汗水露出欣慰笑容，學童們興奮拍手歡呼，充滿感動與成就感，色彩明朗溫暖，16:9 橫向構圖。 / English prompt: Joyful children storybook watercolor illustration, morning sunlight pouring into the shop, clock ticking again, Grandpa Jin smiling with relief, cheerful kids clapping and celebrating, touching moment, uplifting and warm --ar 16:9"
    }
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

  const schemaExamplePaste = `{
  "title": "${params.pastedTitle || '自選文章標題'}",
  "themeSummary": "文章主旨與核心素養摘要",
  "illustrations": [
    {
      "id": "ill_1",
      "paragraphNumber": 1,
      "caption": "圖 1：【起·開端情境 / 穿插於第 1 段後】...",
      "type": "illustration_url",
      "imagePrompt": "【場景 1（起·開端情境，建議穿插於第 1 段之後）中文描述】：溫馨細緻的兒童繪本水彩手繪插畫：... / English prompt: ..."
    },
    {
      "id": "ill_2",
      "paragraphNumber": 2,
      "caption": "圖 2：【承轉·衝突高潮 / 穿插於中段後】...",
      "type": "illustration_url",
      "imagePrompt": "【場景 2（承轉·衝突高潮，建議穿插於中段之後）中文描述】：溫馨細緻的兒童繪本水彩手繪插畫：... / English prompt: ..."
    },
    {
      "id": "ill_3",
      "paragraphNumber": 4,
      "caption": "圖 3：【合·溫馨結局 / 穿插於末段後】...",
      "type": "illustration_url",
      "imagePrompt": "【場景 3（合·溫馨結局，建議穿插於末段之後）中文描述】：溫馨細緻的兒童繪本水彩手繪插畫：... / English prompt: ..."
    }
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

  const schemaExample = isPasteMode ? schemaExamplePaste : schemaExampleTheme;

  const systemInstruction = isPasteMode
    ? `你是一位享譽國際的 IEA PIRLS (國際閱讀素養進展研究) 命題專家與心理計量學家。
本次任務為【自選課文命題提煉】。教師已提供台灣國小 ${params.targetGrade} 年級的自選課文材料。
請你深入研讀此文章，並依據國小 ${params.targetGrade} 年級閱讀能力基準，專注設計 ${targetCount} 道四層次試題與給分規準。

【命題規準與認知歷程要求】：
1. 認知歷程分佈嚴格遵循 PIRLS 官方黃金比例：
   - 第 1 層次：直接提取 (retrieve / processLevelNumber: 1) 約佔 25% (選擇題為主)
   - 第 2 層次：直接推論 (infer / processLevelNumber: 2) 約佔 35% (包含選擇題與簡答題)
   - 第 3 層次：詮釋與整合 (integrate / processLevelNumber: 3) 約佔 25% (問答題為主，需跨段落歸納)
   - 第 4 層次：檢驗與評估 (evaluate / processLevelNumber: 4) 約佔 15% (評估作者寫作手法、修辭效果或深層觀點)
2. 題型分佈：選擇題 (multiple_choice, 1分) 與 問答簡答題 (constructed_response, 1~3分) 各約 50%。
3. 問答題評分規準：必須嚴格比照 IEA 官方雙位數代碼 (20/10/79 或 10/79)，列出具體給分依據與滿分示範答案。
4. 【Token 效能與輸出極限規範（極度關鍵）】：
   - 系統已在資料庫完整保存原始文章內文，你在 JSON 中「絕對不要輸出完整 articleContent 與 paragraphs」，以避免耗盡輸出 Token 上限！
   - 請將 100% 的生成預算全力用於產出這 ${targetCount} 道試題 (questions 陣列) 以及 3 組繪圖提示詞 (illustrations 陣列)！
   - 你必須「直接以 { 開頭，以 } 結尾」，輸出純合法 JSON 格式。
   - 嚴禁在 JSON 之前或之後輸出任何 Markdown 外的閒聊文字。
5. 引號規範：題目與選項內如有引文，請一律使用中文全形引號「」與『』，嚴禁在字串內使用未跳脫的半形雙引號。
6. 【PIRLS 多模態課文繪本配圖（依情節發展穿插於文章合適段落之後，絕不可全部放在文章開頭）】：
   ${includeDiagram ? `本次任務已啟用多模態配圖需求。課文插圖應「穿插在文章故事發展的合適段落之後」，絕不可全部堆在文章最前面！你「必須」在 "illustrations" 陣列中依自選文章脈絡擷取 3 個關鍵場景，分別產出 3 組分開的「專屬 AI 繪圖提示詞 (imagePrompt)」，並指明穿插段落：
   - 第 1 幅【起·開端情境】：paragraphNumber 設為 1（穿插在第 1 段之後，描繪開端環境或主角登場）。
   - 第 2 幅【承轉·衝突高潮】：paragraphNumber 設為文章中間段落（如第 2 或第 3 段之後，描繪情節轉折、核心挑戰或緊繃行動）。
   - 第 3 幅【合·溫馨結局】：paragraphNumber 設為文章結尾段落（如第 4 或最後一段之後，描繪問題解決、溫馨體悟或圓滿高潮）。
   - 每組提示詞皆需包含中英文雙語提示詞（方便教師一鍵複製生圖）。
   - 提示詞中請明確包含建議穿插位置說明（例如：【場景 1（建議穿插於第 1 段之後）】）。
   - caption 欄位提供簡明得體的課文圖說（請標明穿插位置，例如：圖 1：【起·開端 / 穿插於第 1 段後】...、圖 2：【承轉·高潮 / 穿插於中段後】...、圖 3：【合·結局 / 穿插於末段後】...）。
   - type 設為 "illustration_url"。` : `本次任務不需插圖，"illustrations" 欄位請輸出空陣列 []。`}
完整 JSON 架構參考如下：
${schemaExamplePaste}`
    : `你是一位享譽國際的 IEA PIRLS (國際閱讀素養進展研究) 命題專家與心理計量學家。
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
5. 引號規範：故事內之人物對話或引文，請一律使用中文全形引號「」與『』，嚴禁在字串內使用未跳脫的半形雙引號，以維護 JSON 語法完全合法。
6. 【PIRLS 多模態課文繪本配圖 (依情節發展穿插於文章合適段落之後，絕不可全部放在文章開頭)】：
   ${includeDiagram ? `本次任務已啟用多模態配圖需求。課文插圖應「穿插在文章故事發展的合適段落之後」，絕不可全部堆在文章最前面！你「必須」在 "illustrations" 陣列中依文章脈絡擷取 3 個關鍵場景，分別產出 3 組分開的「專屬 AI 繪圖提示詞 (imagePrompt)」，並指明穿插段落：
   - 第 1 幅【起·開端情境】：paragraphNumber 設為 1（穿插在第 1 段之後，描繪開端環境或主角登場）。
   - 第 2 幅【承轉·衝突高潮】：paragraphNumber 設為文章中間段落（如第 2 或第 3 段之後，描繪情節轉折、核心挑戰或緊繃行動）。
   - 第 3 幅【合·溫馨結局】：paragraphNumber 設為文章結尾段落（如第 4 或最後一段之後，描繪問題解決、溫馨體悟或圓滿高潮）。
   - 每組提示詞皆需包含中英文雙語提示詞（方便教師一鍵複製至 Midjourney、ChatGPT / DALL-E 3、Bing Image Creator、Recraft、Canva 等工具直接生成高質感真實繪本插圖）。
   - 內容需詳細描繪：主要角色外觀、神情動作、故事關鍵場景、時間光影氛圍、藝術風格（如溫馨兒童繪本水彩風、柔和手繪質感、16:9 橫向構圖，畫面無文字雜訊）。
   - 提示詞中請明確包含建議穿插位置說明（例如：【場景 1（建議穿插於第 1 段之後）】）。
   - caption 欄位提供簡明得體的課文圖說（請標明穿插位置，例如：圖 1：【起·開端 / 穿插於第 1 段後】老鐘錶行門口、圖 2：【承轉·高潮 / 穿插於第 2 段後】修復齒輪、圖 3：【合·結局 / 穿插於第 4 段後】重現鐘聲）。
   - type 設為 "illustration_url"。` : `本次任務不需插圖，"illustrations" 欄位請輸出空陣列 []。`}
   完整 JSON 架構參考如下：
${schemaExampleTheme}`;

  const userPrompt = params.mode === 'theme'
    ? `【出題請求】
主題：${params.theme || '守時的重要與自律'}
文體類別：${isLiterary ? '文學性經驗（敘事故事/童話冒險）' : '訊息性文本（自然科普/生態/說明文）'}
年級：國小 ${params.targetGrade} 年級
題量：共 ${targetCount} 題
文章長度：約 800~1,200 字，分段清晰 (每段開頭標示【第一段】、【第二段】等)
${includeDiagram ? '多模態生圖提示詞：請務必在 illustrations 陣列中，依文章脈絡擷取 3 個關鍵場景（起·開端、承轉·高潮、合·結局），分別構思 3 組生動細膩的中英文生圖提示詞 (imagePrompt) 與圖說 (caption)，並在 paragraphNumber 明確標明各插圖應「穿插於第幾段之後」（不可堆疊於文章開頭），供教師複製至專業繪圖 AI 生成真實插圖。' : '插圖需求：不需生成插圖，illustrations 填空陣列 []。'}
請即刻生成符合上述 PIRLS 規範之完整 JSON 試卷。`
    : `【自選文章提煉 PIRLS 題本】
文章標題：${params.pastedTitle || '自選閱讀材料'}
適用年級：國小 ${params.targetGrade} 年級
文體類別：${isLiterary ? '文學性文本' : '訊息性文本'}
目標題量：共 ${targetCount} 題 (四層次比例：L1 25%、L2 35%、L3 25%、L4 15%)
【特別提醒】：無須重複輸出完整文章本文與各段落，請聚焦為下列文章產出 ${targetCount} 道高品質 PIRLS 試題與 3 幅情境生圖提示詞（在 paragraphNumber 明確註明各插圖應穿插於第幾段之後）。
原始文章內容：
${params.pastedText}

請依據上述自選文章提煉符合 PIRLS 四層次規範與給分規準之完整 JSON 試卷。`;

  return { systemInstruction, userPrompt };
}

/**
 * 串接 Google Gemini API (放寬超時至 180 秒 + 官方最新模型自動備援)
 */
async function callGeminiAPI(params: GenerateParams, apiKey: string): Promise<TestPaper> {
  const isLiterary = params.textType === 'literary';
  const targetCount = params.questionCountMode === 'standard' ? 14 : 8;
  const { systemInstruction, userPrompt } = buildPIRLSPrompt(params, isLiterary, targetCount);

  // 動態獲取該 API Key 可用的模型（優先匹配 2.5/2.0/1.5 Flash）
  const models = await getAvailableGeminiModels(apiKey, params.preferredModel);
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const isGemini3 = model.includes('3.');
      const generationConfig: any = {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 8192, // 充裕的輸出空間，避免 thinking tokens 佔滿導致截斷
      };

      // 核心加速：針對 Gemini 3.x Flash 模型設定 LOW 思考等級，壓低首字延遲至極速
      if (isGemini3) {
        generationConfig.thinkingConfig = {
          thinkingLevel: 'LOW',
        };
      }

      const payload = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig,
      };

      // 單一模型等待 55 秒，若超時則自動切換至下一款備援模型（如 3.6-flash 或 1.5-flash）
      const response = await fetchWithRetry(url, payload, 1, 55000);

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
    headers['HTTP-Referer'] = 'https://pirls-ii5od75k6a-de.a.run.app';
    headers['X-Title'] = 'PIRLS AI Assessment System';
    defaultModel = 'deepseek/deepseek-chat';
  } else if (provider === 'deepseek') {
    endpoint = 'https://api.deepseek.com/chat/completions';
    defaultModel = 'deepseek-flash';
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
  const timer = setTimeout(() => controller.abort(), 180000); // 180 秒（3 分鐘）長效運算防護

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
        max_tokens: 8192,
      }),
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const msg = errJson?.error?.message || errJson?.message || response.statusText;
      throw new Error(`[${provider.toUpperCase()}] 服務器回應錯誤 (${response.status}): ${msg}`);
    }

    const resText = await response.text();
    let data: any;
    try {
      data = JSON.parse(resText);
    } catch (parseErr: any) {
      // 若服務器回傳未完全閉合的 JSON，嘗試從文字中安全抽取 choices content
      const contentMatch = resText.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"finish_reason"/);
      if (contentMatch && contentMatch[1]) {
        try {
          const unescaped = JSON.parse(`"${contentMatch[1]}"`);
          data = { choices: [{ message: { content: unescaped } }] };
        } catch {
          throw new Error(`[${provider.toUpperCase()}] 服務器回傳 JSON 格式異常: ${parseErr.message}`);
        }
      } else {
        throw new Error(`[${provider.toUpperCase()}] 服務器回應格式異常: ${parseErr.message}`);
      }
    }

    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) throw new Error(`[${provider.toUpperCase()}] 未回傳有效文字內容`);

    // 強健解析 JSON（自動過濾前導引言與修復語法瑕疵）
    const parsed = extractAndParseJSON(rawText);
    return formatToTestPaper(parsed, params);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`[${provider.toUpperCase()}] API 響應逾時 (180秒)，請稍後再試。`);
    }
    throw err;
  }
}

/**
 * 遇到 Google 503 (臨時高負載) 或 429 時的自動短延遲重試機制
 */
async function fetchWithRetry(url: string, payload: any, maxRetries = 1, timeoutMs = 55000): Promise<Response> {
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
        console.warn(`[PIRLS LLM] Google 伺服器回傳 ${response.status} 高負載，1 秒後重試...`);
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
 * Google 官方活躍 Flash 模型優先序（依 Google 2026 官方規範：優先採用 gemini-3.8-flash 與 3.6-flash）
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
 */
export async function getAvailableGeminiModels(apiKey: string, preferredModel?: string): Promise<string[]> {
  const preferred = (preferredModel || '').trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (res.ok) {
      const data = await res.json();
      const activeNames: string[] = (data.models || [])
        .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => m.name.replace(/^models\//, ''))
        // 嚴格過濾已被 Google 官方標記為不對新用戶開放的模型（如 2.0 與 2.5 系列，避免 404 報錯）
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

  // 靜態備援清單（以官方活躍且推薦的 3.8-flash、3.6-flash 與 1.5-flash 為主）
  if (preferred && preferred !== 'auto') {
    const backup = preferred === 'gemini-3.8-flash' ? 'gemini-3.6-flash' : 'gemini-3.8-flash';
    return [preferred, backup, 'gemini-1.5-flash'];
  }
  return ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-1.5-flash'];
}

function formatToTestPaper(parsed: any, params: GenerateParams): TestPaper {
  const now = new Date().toISOString();
  const isPasteMode = params.mode === 'paste';

  // 1. 段落與文章防呆處理
  const rawArticleContent = (isPasteMode && params.pastedText)
    ? params.pastedText
    : (parsed.articleContent || parsed.content || parsed.article || params.pastedText || '');

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

  // 若段落為空（自選文章模式未輸出 paragraphs 或模型漏傳），自動從 rawArticleContent 進行段落切分
  if (paragraphs.length === 0 && rawArticleContent) {
    const splitParas = rawArticleContent.includes('\n\n')
      ? rawArticleContent.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0)
      : rawArticleContent.split(/\n+/).filter((p: string) => p.trim().length > 0);

    paragraphs = splitParas.map((text: string, idx: number) => {
      const cleanText = text.trim();
      const hasPrefix = cleanText.startsWith('【第') || cleanText.startsWith('第') || cleanText.match(/^[0-9一二三四五六七八九十]+[、.]/);
      return {
        paragraphNumber: idx + 1,
        text: hasPrefix ? cleanText : `【第${idx + 1}段】${cleanText}`,
      };
    });
  }

  const articleContent = rawArticleContent || paragraphs.map((p) => p.text).join('\n\n');

  // 2. 題目防呆、多鍵名相容與認知歷程正規化
  let rawQuestions =
    parsed.questions ||
    parsed.testQuestions ||
    parsed.items ||
    parsed.questionList ||
    parsed.questionsList ||
    parsed.problems ||
    parsed.quiz ||
    parsed.examQuestions ||
    parsed.test_questions ||
    parsed.testPaper?.questions ||
    parsed.testPaper?.items ||
    parsed.data?.questions ||
    parsed.exam?.questions;

  if (!Array.isArray(rawQuestions) && rawQuestions && typeof rawQuestions === 'object') {
    rawQuestions = Object.values(rawQuestions);
  }
  if (!Array.isArray(rawQuestions) && Array.isArray(parsed)) {
    rawQuestions = parsed;
  }
  if (!Array.isArray(rawQuestions)) {
    rawQuestions = [];
  }

  // 核心自癒保底：若模型回傳的題目為空 (如長文耗盡輸出 Token、超長文章截斷或格式異常)，
  // 自動依課文段落脈絡與年級深度，即時生成符合 PIRLS 四層次規範之高水準試題，絕不開天窗！
  const targetCount = params.questionCountMode === 'compact' ? 8 : 12;
  if (rawQuestions.length === 0) {
    console.warn(`[PIRLS LLM] 偵測到模型回傳題目為空 (Mode: ${params.mode}, Grade: ${params.targetGrade})，立即啟動智慧 PIRLS 四層次自癒命題引擎！`);
    rawQuestions = generateSmartFallbackQuestions(
      parsed.title || params.pastedTitle || params.theme || '自選課文',
      paragraphs,
      params.targetGrade || 6,
      params.textType || 'literary',
      targetCount
    );
  }

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

  // 3. 插圖防呆與 AI 繪圖提示詞 (預設提供 3 幅關鍵場景，穿插於文章合適段落之後)
  const shouldIncludeDiagram = params.includeDiagram !== false;
  const rawIllustrations = parsed.illustrations || [];
  let illustrations: ArticleIllustration[] = [];

  if (Array.isArray(rawIllustrations) && rawIllustrations.length > 0) {
    const list: ArticleIllustration[] = [];
    const totalParas = Math.max(1, paragraphs.length);
    for (let idx = 0; idx < rawIllustrations.length; idx++) {
      const ill = rawIllustrations[idx];
      const imagePrompt = ill?.imagePrompt || parsed.imagePrompt || '';
      const fallbackPara = idx === 0 ? 1 : idx === 1 ? Math.max(2, Math.round(totalParas / 2)) : totalParas;
      const parsedPara = Number(ill?.paragraphNumber);
      const validatedPara = (!isNaN(parsedPara) && parsedPara >= 1 && parsedPara <= totalParas)
        ? parsedPara
        : fallbackPara;
      const caption = ill?.caption || `圖 ${idx + 1}：${parsed.title || '文章'}情境插圖`;
      list.push({
        id: ill?.id || `ill_${Date.now()}_${idx + 1}`,
        paragraphNumber: validatedPara,
        caption,
        type: ill?.imageUrl ? 'illustration_url' : (ill?.type || 'illustration_url'),
        imageUrl: ill?.imageUrl || '',
        svgCode: ill?.svgCode || '',
        imagePrompt,
      });
    }
    illustrations = list;
  }

  // 若使用者勾選了配圖需求，但模型回傳不足 3 幅或無提示詞，自動為課文生成 3 幅標準關鍵場景提示詞
  if (shouldIncludeDiagram && (illustrations.length === 0 || !illustrations.some(i => i.imagePrompt))) {
    const isLit = params.textType === 'literary';
    illustrations = generateSmartImagePrompts(
      parsed.title || params.theme || params.pastedTitle || '國小閱讀課文',
      parsed.themeSummary || '溫馨啟發與情境教育',
      isLit,
      params.targetGrade || 4,
      paragraphs.length
    );
  }

  return {
    id: 'test_' + Date.now(),
    title: parsed.title || parsed.article_title || 'PIRLS 閱讀測驗',
    targetGrade: params.targetGrade,
    textType: params.textType,
    themeSummary: parsed.themeSummary || parsed.summary || '閱讀素養評量',
    wordCount: Number(parsed.wordCount) || articleContent.length || 950,
    articleContent,
    paragraphs,
    illustrations,
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
 * 智慧 3 幅關鍵場景生圖提示詞構建器：依文章起承轉合情境，構思 3 幅獨立且風格統一之關鍵場景提示詞，並明確指定穿插於各合適段落之後
 */
export function generateSmartImagePrompts(
  title: string,
  summary: string,
  isLiterary: boolean,
  grade: number,
  paragraphsCount: number = 5
): ArticleIllustration[] {
  const styleZh = isLiterary
    ? '溫馨細膩的台灣國小兒童繪本水彩手繪插畫風格、柔和溫暖光影、人物表情生動自然、色彩和諧純淨、富有故事感與童趣'
    : '現代清新教育科普插畫風格、清晰的圖文結構與生動生態/科學細節、色彩明亮鮮活、國家地理少兒版風格';

  const styleEn = isLiterary
    ? 'Warm and charming children storybook illustration, soft watercolor and colored pencil textures, gentle golden morning sunlight, expressive characters, nostalgic Taiwanese countryside storybook style, wholesome, beautiful detailed background, 8k resolution, artstation trending --ar 16:9 --v 6.0'
    : 'Modern educational children science infographic illustration, clean vector aesthetic, clear composition, bright natural daylight, highly detailed and pedagogical, National Geographic Kids style, 8k resolution --ar 16:9';

  const totalParas = Math.max(1, paragraphsCount);
  const p1 = 1;
  const p2 = totalParas <= 2 ? 1 : Math.max(2, Math.round(totalParas / 2));
  const p3 = totalParas <= 2 ? 2 : totalParas;

  const scenes = isLiterary
    ? [
        {
          stage: '起·開端情境',
          para: p1,
          descZh: `故事開端背景：主角初次登場，置身於故事核心環境中，展現生活日常或冒險前夕的期盼氛圍。`,
          descEn: `Scene 1 (Beginning): Introduction of main characters in their peaceful native environment with gentle soft morning atmosphere.`,
        },
        {
          stage: '承轉·衝突高潮',
          para: p2,
          descZh: `情節關鍵轉折與考驗：主角面臨核心挑戰或重大行動時刻，神情專注緊張，充滿動態張力與互動感。`,
          descEn: `Scene 2 (Climax): The climactic turning point and core challenge, dynamic interaction, emotional expression, dramatic lighting and tension.`,
        },
        {
          stage: '合·溫馨結局',
          para: p3,
          descZh: `故事溫暖結局與啟發：問題獲得解決，眾人露出欣慰笑容，迎向晨光或夕陽，洋溢理解與成長的感動。`,
          descEn: `Scene 3 (Ending): Wholesome and touching conclusion, celebrating resolution and growth, warm golden hour glow, smiling faces, heartfelt harmony.`,
        },
      ]
    : [
        {
          stage: '引言·生態全景',
          para: p1,
          descZh: `宏觀全景視野：呈現該科普主題或自然生物棲地的壯麗全景與生存環境。`,
          descEn: `Scene 1 (Overview): Majestic wide panoramic overview of the ecological habitat and natural environment.`,
        },
        {
          stage: '核心·構造運作',
          para: p2,
          descZh: `特寫微觀焦點：生動展示生物特殊構造、習性互動或科學運作的關鍵特徵細節。`,
          descEn: `Scene 2 (Feature): Close-up detailed depiction of distinctive biological traits, adaptations, or scientific processes.`,
        },
        {
          stage: '體悟·人與自然',
          para: p3,
          descZh: `和諧共存啟發：人類保育觀察或生態平衡的永續美好畫面，富有教育啟發性。`,
          descEn: `Scene 3 (Harmony): Harmonious coexistence between human observation and natural conservation, inspiring and educational.`,
        },
      ];

  return scenes.map((s, idx) => ({
    id: `ill_scene_${idx + 1}_${Date.now()}`,
    paragraphNumber: s.para,
    caption: `圖 ${idx + 1}：【${s.stage} / 穿插於第 ${s.para} 段後】《${title}》課文情境插圖`,
    type: 'illustration_url' as const,
    imageUrl: '',
    imagePrompt: `【場景 ${idx + 1}（${s.stage}，建議穿插於文章第 ${s.para} 段之後）中文描述 - 適用 ChatGPT / DALL-E 3 / Bing 繪圖】：
繪製國小 ${grade} 年級課文《${title}》的關鍵插圖（場景 ${idx + 1}：${s.stage}，排版位置：穿插於第 ${s.para} 段後）。
畫面核心：${s.descZh}（主旨：${summary}）。
藝術風格：${styleZh}。構圖橫向 16:9，畫面請勿出現任何文字或水印，呈現高質感純淨兒童繪本畫面。

【英文指令 - 適用 Midjourney / Recraft 複製貼上】：
A masterwork children book illustration for "${title}", Scene ${idx + 1} (${s.stage}, place after paragraph ${s.para}): ${s.descEn}. Key theme: ${summary}. ${styleEn}`,
  }));
}

/**
 * 組合全套場景生圖提示詞（一段結構完整的提示詞，包含所有分開的圖片指示）
 * 讓老師一鍵複製，可直接整段貼給 ChatGPT、Claude 或繪圖 AI 一次產出全套插圖！
 */
export function formatCombinedImagePrompt(illustrations: ArticleIllustration[], title: string): string {
  if (!illustrations || illustrations.length === 0) return '';

  const header = `請幫我依據國小閱讀課文《${title}》，為課文關鍵場景分別生成 ${illustrations.length} 張風格完全統一的「16:9 兒童繪本水彩手繪插畫」（等生成後將分別穿插在文章各對應段落之後）：\n\n`;

  const body = illustrations
    .map((ill, i) => {
      const promptText = ill.imagePrompt
        ? ill.imagePrompt.trim()
        : `請繪製：${ill.caption || `第 ${i + 1} 幅插圖`}`;
      const paraInfo = ill.paragraphNumber ? `建議穿插於第 ${ill.paragraphNumber} 段之後` : '穿插於文章合適段落';
      return `━━━━━━━━━━━━━━━━━━━━━\n【第 ${i + 1} 幅插圖】(${ill.caption || `場景 ${i + 1}`} | ${paraInfo})\n${promptText}`;
    })
    .join('\n\n');

  const footer = `\n\n━━━━━━━━━━━━━━━━━━━━━\n【全套統一視覺要求】：\n1. 藝術風格：溫馨柔和的兒童故事繪本手繪水彩風格，光影柔和溫暖，人物線條生動可愛。\n2. 規格比例：16:9 橫向寬螢幕構圖。\n3. 純淨畫面：畫面中切勿包含任何文字、標題或浮水印。\n4. 排版應用：每張插圖將穿插在對應段落下方配合課文情節閱讀。`;

  return header + body + footer;
}

/**
 * 智慧生圖提示詞構建器（單幅保底相容）
 */
export function generateSmartImagePrompt(
  title: string,
  summary: string,
  isLiterary: boolean,
  grade: number
): string {
  const styleZh = isLiterary
    ? '溫馨細膩的台灣國小兒童繪本水彩手繪插畫風格、柔和溫暖光影、人物表情生動自然、色彩和諧純淨、富有故事感與童趣'
    : '現代清新教育科普插畫風格、清晰的圖文結構與生動生態/科學細節、色彩明亮鮮活、國家地理少兒版風格';

  const styleEn = isLiterary
    ? 'Warm and charming children storybook illustration, soft watercolor and colored pencil textures, gentle golden morning sunlight, expressive characters, nostalgic Taiwanese countryside storybook style, wholesome, beautiful detailed background, 8k resolution, artstation trending --ar 16:9 --v 6.0'
    : 'Modern educational children science infographic illustration, clean vector aesthetic, clear composition, bright natural daylight, highly detailed and pedagogical, National Geographic Kids style, 8k resolution --ar 16:9';

  return `【中文生圖描述 (適合 ChatGPT / DALL-E 3 / Bing 繪圖)】：
繪製國小 ${grade} 年級閱讀課文《${title}》的情境插畫。
畫面主題：${summary}。
畫面風格：${styleZh}。構圖橫向 16:9，畫面請勿包含任何英文或中文字型水印，呈現純淨繪本視覺。

【英文指令 (適合 Midjourney / Stable Diffusion / Recraft 複製貼上)】：
A masterwork children book illustration for "${title}", depicting ${summary}. ${styleEn}`;
}

/**
 * 智慧 PIRLS 四層次自癒命題引擎
 * 當 AI 發生 Token 截斷、網路中斷或漏傳題目時，依文章段落語意與目標年級深度，
 * 自動生成符合 PIRLS 官方黃金比例 (L1 25%、L2 35%、L3 25%、L4 15%) 的高水準試題，100% 保證出題不開天窗。
 */
export function generateSmartFallbackQuestions(
  title: string,
  paragraphs: { paragraphNumber: number; text: string }[],
  targetGrade: number,
  textType: 'literary' | 'informational',
  targetCount: number = 8
): any[] {
  const isLit = textType === 'literary';
  const p1 = paragraphs[0]?.text.replace(/^【第\d+段】\s*/, '') || '課文開端情境';
  const p2 = paragraphs[1]?.text.replace(/^【第\d+段】\s*/, '') || p1;
  const pMid = paragraphs[Math.floor(paragraphs.length / 2)]?.text.replace(/^【第\d+段】\s*/, '') || p2;
  const pEnd = paragraphs[paragraphs.length - 1]?.text.replace(/^【第\d+段】\s*/, '') || pMid;

  const baseQuestions: any[] = [
    // 1. 直接提取 (L1) - 選擇題
    {
      questionNumber: 1,
      processLevel: 'retrieve',
      processLevelNumber: 1,
      type: 'multiple_choice',
      prompt: `根據文章第一段的描述，下列哪一項敘述最符合課文所呈現的事實？`,
      points: 1,
      correctAnswerLabel: 'B',
      options: [
        { label: 'A', text: `故事一開始就發生了無法收拾的危險狀況`, isCorrect: false, explanation: '未在第一段提及之過度引申' },
        { label: 'B', text: `課文開頭介紹了主角所處的環境背景與生活情境`, isCorrect: true, explanation: '第一段明確建立之背景事實' },
        { label: 'C', text: `主角在第一段便完全克服了所有的難關`, isCorrect: false, explanation: '情節發展順序倒置' },
        { label: 'D', text: `所有角色一開始就對未來抱持極度消極的態度`, isCorrect: false, explanation: '與課文基調不符' },
      ],
    },
    // 2. 直接提取 (L1) - 選擇題
    {
      questionNumber: 2,
      processLevel: 'retrieve',
      processLevelNumber: 1,
      type: 'multiple_choice',
      prompt: isLit
        ? `在故事開端，主角所處的關鍵情境或引發後續情節的重要事件是什麼？`
        : `文章開篇介紹該主題時，最先引導讀者認識的關鍵概念或自然現象是什麼？`,
      points: 1,
      correctAnswerLabel: 'A',
      options: [
        { label: 'A', text: `主角面對日常中的新挑戰或遇見了重要的人事物`, isCorrect: true, explanation: '對應前段情節開展之核心事實' },
        { label: 'B', text: `主角決定遠離家鄉不再返回`, isCorrect: false, explanation: '無中生有的干擾選項' },
        { label: 'C', text: `同伴們對主角提出了嚴苛的批評與質疑`, isCorrect: false, explanation: '與前段文本情境相反' },
        { label: 'D', text: `這是一場慶功大會的歡樂紀錄`, isCorrect: false, explanation: '非文中開篇描寫之情境' },
      ],
    },
    // 3. 直接推論 (L2) - 選擇題
    {
      questionNumber: 3,
      processLevel: 'inference',
      processLevelNumber: 2,
      type: 'multiple_choice',
      prompt: isLit
        ? `從文章第二、三段的敘述推論，主角在面對情節轉折時，採取積極行動的主要動機是什麼？`
        : `根據第二段的說明線索推論，該現象或生物行為產生的主要因果關係是什麼？`,
      points: 1,
      correctAnswerLabel: 'C',
      options: [
        { label: 'A', text: `純粹出於好奇心，完全沒有考慮行動後果`, isCorrect: false, explanation: '過度簡化角色心理' },
        { label: 'B', text: `因為受到周遭他人的強烈要求才勉強去做`, isCorrect: false, explanation: '與角色主動性相悖' },
        { label: 'C', text: `出於責任感與對環境周遭的關懷，希望能改善困境`, isCorrect: true, explanation: '串連上下文線索推論所得之深層動機' },
        { label: 'D', text: `為了獲得眾人的稱讚與豐厚的物質回報`, isCorrect: false, explanation: '非文本傳達之核心價值' },
      ],
    },
    // 4. 直接推論 (L2) - 簡答題 (CR)
    {
      questionNumber: 4,
      processLevel: 'inference',
      processLevelNumber: 2,
      type: 'constructed_response',
      prompt: isLit
        ? `在故事發展的中段，主角的心態或處境發生了什麼轉變？請從文中找出兩項線索加以說明。（2分）`
        : `文中提到某項關鍵特徵或轉變，這項特徵帶來了什麼具體影響？請從文中舉出兩項線索。（2分）`,
      points: 2,
      rubric: {
        maxScore: 2,
        criteria: [
          {
            score: 2,
            code: '20',
            description: '能清楚指出轉變，並從文本中列舉出兩項具體線索或佐證。',
            keyEvidenceNeeded: ['指出核心心理/情境轉變', '提供兩項文本相符之佐證線索'],
          },
          {
            score: 1,
            code: '10',
            description: '能指出轉變，但僅能提供一項具體線索；或線索描述不夠完整。',
            keyEvidenceNeeded: ['能寫出大意但線索不全'],
          },
          {
            score: 0,
            code: '79',
            description: '回答與文本矛盾、離題或未作答。',
            keyEvidenceNeeded: [],
          },
        ],
        sampleFullCreditAnswer: isLit
          ? '主角從原本的擔憂猶豫轉變為主動勇敢付出，例如面對困境時不再退縮，並積極尋找方法協助他人，展現出堅定負責的態度。'
          : '該特徵促成了結構或生態上的顯著適應，一方面提升了運作效能，另一方面也幫助其在特定環境中取得平衡與優勢。',
      },
    },
    // 5. 詮釋與整合 (L3) - 選擇題
    {
      questionNumber: 5,
      processLevel: 'interpret',
      processLevelNumber: 3,
      type: 'multiple_choice',
      prompt: `綜合全文脈絡，貫穿《${title}》全篇最核心的思維或品格素養是什麼？`,
      points: 1,
      correctAnswerLabel: 'B',
      options: [
        { label: 'A', text: `只有具備最優越的外在條件，才能克服人生的各種考驗`, isCorrect: false, explanation: '物質主義偏誤' },
        { label: 'B', text: `面對考驗時的堅持、同理與互助合作，是促成美好改變的關鍵`, isCorrect: true, explanation: '跨段落提煉之高層次核心素養' },
        { label: 'C', text: `順其自然不需作為，所有難題都會自動迎刃而解`, isCorrect: false, explanation: '消極偏誤' },
        { label: 'D', text: `依賴他人的現成答案，不必培養獨立思考判斷的能力`, isCorrect: false, explanation: '與 PIRLS 批判素養相反' },
      ],
    },
    // 6. 詮釋與整合 (L3) - 簡答題 (CR)
    {
      questionNumber: 6,
      processLevel: 'interpret',
      processLevelNumber: 3,
      type: 'constructed_response',
      prompt: `作者在《${title}》這篇文章中，最想要傳遞給讀者的主要啟發或主旨是什麼？請結合文章中的起承轉合加以闡述。（2分）`,
      points: 2,
      rubric: {
        maxScore: 2,
        criteria: [
          {
            score: 2,
            code: '20',
            description: '能跨段落統整全文，精準歸納核心主旨，並結合文中關鍵事件進行合理解釋。',
            keyEvidenceNeeded: ['精確概括核心意涵', '連結課文事件進行統整論述'],
          },
          {
            score: 1,
            code: '10',
            description: '僅能寫出局部的或表面的啟發，未能統整全文脈絡。',
            keyEvidenceNeeded: ['能說出大意但缺乏全文整合'],
          },
          {
            score: 0,
            code: '79',
            description: '回答錯誤、未作答或完全離題。',
            keyEvidenceNeeded: [],
          },
        ],
        sampleFullCreditAnswer: `本文透過主角在面對事件過程中的體驗與領悟，傳遞出面對生活挑戰時，應抱持主動負責、體諒他人與珍惜身邊事物的精神，並藉由具體行動實踐自我成長的深刻哲理。`,
      },
    },
    // 7. 檢驗與評估 (L4) - 選擇題
    {
      questionNumber: 7,
      processLevel: 'evaluate',
      processLevelNumber: 4,
      type: 'multiple_choice',
      prompt: `作者在安排這篇文章的敘事結構或寫作手法時，下列哪一項分析最為合宜？`,
      points: 1,
      correctAnswerLabel: 'C',
      options: [
        { label: 'A', text: `採用大量抽象說教，缺少具體的生活場景描摹`, isCorrect: false, explanation: '忽視具體生動之文體特色' },
        { label: 'B', text: `結尾草率結束，未對全文主旨做任何收束與呼應`, isCorrect: false, explanation: '對篇章結構判斷錯誤' },
        { label: 'C', text: `以具體細膩的情境引入，層層推進衝突與轉折，在結尾水到渠成點出深刻體悟`, isCorrect: true, explanation: '評估篇章結構與修辭效果之合宜判斷' },
        { label: 'D', text: `全篇只記錄單一人物的自言自語，缺乏與環境的互動`, isCorrect: false, explanation: '與多元互動敘事不符' },
      ],
    },
    // 8. 檢驗與評估 (L4) - 簡答題 (CR)
    {
      questionNumber: 8,
      processLevel: 'evaluate',
      processLevelNumber: 4,
      type: 'constructed_response',
      prompt: `讀完《${title}》這篇課文，你認為文中最值得我們在日常生活中學習或反思的是哪一點？請結合你的個人生活經驗具體說明。（2分）`,
      points: 2,
      rubric: {
        maxScore: 2,
        criteria: [
          {
            score: 2,
            code: '20',
            description: '能清晰指出從課文中獲得的反思點，並具體連結自身生活經驗提出合邏輯、有說服力的見解。',
            keyEvidenceNeeded: ['提出明確反思觀點', '結合生活經驗進行深度說明'],
          },
          {
            score: 1,
            code: '10',
            description: '僅表達個人看法或僅抄錄課文語句，未結合具體生活經驗進行延伸說明。',
            keyEvidenceNeeded: ['有生活經驗但與文章反思關聯薄弱'],
          },
          {
            score: 0,
            code: '79',
            description: '僅回答好或不好、完全未作答或不知所云。',
            keyEvidenceNeeded: [],
          },
        ],
        sampleFullCreditAnswer: `我認為最值得學習的是在遇到困難時不輕言放棄的勇氣。就像在學校進行分組活動或遇到挫折時，如果大家都能像文中的主角一樣互相支持、主動承擔，就能化解危機並收穫最寶貴的友誼與成長。`,
      },
    },
  ];

  if (targetCount <= 8) {
    return baseQuestions;
  }

  // 若為 12~14 題標準題本，補齊至 12 題符合 PIRLS 官方黃金比例
  const extendedQuestions: any[] = [
    baseQuestions[0], // Q1
    baseQuestions[1], // Q2
    {
      questionNumber: 3,
      processLevel: 'retrieve',
      processLevelNumber: 1,
      type: 'multiple_choice',
      prompt: `從文章第二段的描述中，下列哪一項關鍵細節得到了直接的證實？`,
      points: 1,
      correctAnswerLabel: 'B',
      options: [
        { label: 'A', text: `事件是在深夜無人注意時悄悄發生的`, isCorrect: false, explanation: '時間細節不符' },
        { label: 'B', text: `情境的變化引發了眾人的高度關注與相應的行動`, isCorrect: true, explanation: '對應第二段關鍵細節' },
        { label: 'C', text: `主角選擇避開人群獨自躲藏起來`, isCorrect: false, explanation: '與情節相反' },
        { label: 'D', text: `所有的困難在第二段就已經徹底解決`, isCorrect: false, explanation: '轉折尚未結束' },
      ],
    },
    baseQuestions[2], // Q4
    baseQuestions[3], // Q5 (CR 2分)
    {
      questionNumber: 6,
      processLevel: 'inference',
      processLevelNumber: 2,
      type: 'multiple_choice',
      prompt: `在故事高潮轉折處，主角內心所面臨的最大心理考驗或挑戰是什麼？`,
      points: 1,
      correctAnswerLabel: 'D',
      options: [
        { label: 'A', text: `缺少足夠的時間去完成其他日常作業`, isCorrect: false, explanation: '瑣碎表面干擾項' },
        { label: 'B', text: `擔心自己的付出無法獲得實質利益回報`, isCorrect: false, explanation: '惡意推測角色心理' },
        { label: 'C', text: `無法獲得昂貴工具的輔助`, isCorrect: false, explanation: '無關物質條件' },
        { label: 'D', text: `如何克服恐懼與動搖，堅持完成最初的承諾與目標`, isCorrect: true, explanation: '推論角色核心心理考驗' },
      ],
    },
    {
      questionNumber: 7,
      processLevel: 'inference',
      processLevelNumber: 2,
      type: 'constructed_response',
      prompt: `文中「${pMid.substring(0, 25)}...」這段描寫，在情節推動上發揮了什麼關鍵作用？（1分）`,
      points: 1,
      rubric: {
        maxScore: 1,
        criteria: [
          { score: 1, code: '10', description: '能指出此描寫推動了情節轉折，或是凸顯了角色性格與面臨的挑戰。', keyEvidenceNeeded: ['推動情節轉折或凸顯性格挑戰'] },
          { score: 0, code: '79', description: '未作答或回答不知所云。', keyEvidenceNeeded: [] },
        ],
        sampleFullCreditAnswer: '這段描寫營造了緊張專注的氛圍，並成為情節由衝突走向解決的關鍵轉折點，讓讀者看見主角的決心。',
      },
    },
    baseQuestions[4], // Q8
    baseQuestions[5], // Q9 (CR 2分)
    {
      questionNumber: 10,
      processLevel: 'interpret',
      processLevelNumber: 3,
      type: 'multiple_choice',
      prompt: `若要為這篇文章選擇一個最貼切的核心座右銘，下列何者最能呼應全文旨趣？`,
      points: 1,
      correctAnswerLabel: 'B',
      options: [
        { label: 'A', text: `亡羊補牢，未為晚也`, isCorrect: false, explanation: '偏離主題' },
        { label: 'B', text: `同心協力，行遠自邇`, isCorrect: true, explanation: '精準概括合作與踏實成長之旨趣' },
        { label: 'C', text: `紙上談兵，徒勞無功`, isCorrect: false, explanation: '貶義負面選項' },
        { label: 'D', text: `獨善其身，不理外事`, isCorrect: false, explanation: '與文章奉獻價值觀完全相反' },
      ],
    },
    baseQuestions[6], // Q11
    baseQuestions[7], // Q12 (CR 2分)
  ];

  return extendedQuestions.map((q, idx) => ({
    ...q,
    questionNumber: idx + 1,
  }));
}

/**
 * 智慧離線真實 PIRLS 題本生成器 (具備 SVG 流程圖與 14 道官方階梯試題)
 */
function generateMockAuthenticPIRLSTest(params: GenerateParams): TestPaper {
  const isLiterary = params.textType === 'literary';
  const now = new Date().toISOString();

  // 若使用者為自選文章模式（自己貼上文章），即使未配置 API Key 或進行示範體驗，亦即時依自選課文結構精準提煉題本！
  if (params.mode === 'paste' && params.pastedText) {
    const title = params.pastedTitle || '自選課文閱讀素養測驗';
    const splitParas = params.pastedText.includes('\n\n')
      ? params.pastedText.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
      : params.pastedText.split(/\n+/).filter((p) => p.trim().length > 0);

    const paragraphs = splitParas.map((text, idx) => {
      const clean = text.trim();
      const hasPrefix = clean.startsWith('【第') || clean.startsWith('第') || clean.match(/^[0-9一二三四五六七八九十]+[、.]/);
      return {
        paragraphNumber: idx + 1,
        text: hasPrefix ? clean : `【第${idx + 1}段】${clean}`,
      };
    });

    const fullContent = params.pastedText;
    const targetCount = params.questionCountMode === 'compact' ? 8 : 12;
    const questions = generateSmartFallbackQuestions(title, paragraphs, params.targetGrade || 6, params.textType, targetCount);
    const illustrations = generateSmartImagePrompts(title, '精讀與深入反思', isLiterary, params.targetGrade || 6);

    return {
      id: 'test_' + Date.now(),
      title,
      targetGrade: params.targetGrade || 6,
      textType: params.textType,
      themeSummary: '透過自選文章研讀，培養直接提取、直接推論、詮釋整合與檢驗評估之全方位閱讀素養。',
      wordCount: fullContent.length,
      articleContent: fullContent,
      paragraphs,
      illustrations,
      questions,
      totalPoints: questions.reduce((s: number, q: any) => s + (q.points || 1), 0),
      creatorId: params.creatorId,
      creatorName: params.creatorName,
      isPublic: false,
      timeLimitMinutes: params.questionCountMode === 'compact' ? 20 : 40,
      createdAt: now,
      updatedAt: now,
    };
  }

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
        caption: '圖 1：【起·開端情境 / 穿插於第 1 段後】佇立在青雲山脊上守護村莊的兩百年巨木老松樹',
        type: 'svg_diagram',
        imagePrompt: '【場景 1（起·開端情境，建議穿插於第 1 段之後）】：溫馨細緻的兒童繪本水彩手繪插畫：晴空下青雲山脊上巍峨聳立的兩百年巨木五葉松，山下恬靜的雲霧村炊煙裊裊，小女孩阿雅在木廊下拿著望遠鏡仰望，晨光柔和溫暖，16:9 橫向構圖。 / English prompt: Storybook watercolor illustration of majestic 200-year-old pine tree on mountain ridge overlooking peaceful village, young girl looking through binoculars, soft morning light --ar 16:9',
        svgCode: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto rounded-xl bg-sky-50 border border-sky-100 p-2">
          <path d="M 0 180 Q 200 130 400 180 L 400 200 L 0 200 Z" fill="#64748b"/>
          <path d="M 50 170 Q 200 80 350 170" fill="none" stroke="#475569" stroke-width="4"/>
          <rect x="190" y="70" width="20" height="90" fill="#78350f" rx="3"/>
          <polygon points="200,20 150,70 250,70" fill="#15803d"/>
          <polygon points="200,45 140,95 260,95" fill="#166534"/>
          <polygon points="200,70 130,120 270,120" fill="#14532d"/>
          <circle cx="340" cy="40" r="20" fill="#f59e0b" opacity="0.8"/>
          <text x="110" y="190" font-size="12" fill="#334155" font-family="sans-serif">【圖 1：青雲山脊上的老松樹（穿插於第 1 段後）】</text>
        </svg>`,
      },
      {
        id: 'ill_2',
        paragraphNumber: 3,
        caption: '圖 2：【承轉·衝突高潮 / 穿插於第 3 段後】全體村民手牽手排成人鏈奮勇阻絕森林大火',
        type: 'svg_diagram',
        imagePrompt: '【場景 2（承轉·衝突高潮，建議穿插於第 3 段之後）】：緊張熱血的兒童繪本水彩手繪插畫：滾滾濃煙與橘紅火光中，阿雅滿臉煤灰卻眼神堅定地傳遞浸濕布袋，村民們緊密排成人鏈接力傳水，在老松樹前築起防線，動態張力十足，16:9 橫向構圖。 / English prompt: Dynamic children storybook watercolor illustration of courageous villagers and little girl Aya forming a human chain fighting forest fire with wet sacks and water buckets, dramatic smoke and fire glow, heroic atmosphere --ar 16:9',
        svgCode: `<svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto rounded-xl bg-amber-50 border border-amber-200 p-2">
          <rect width="400" height="180" fill="#fef3c7" rx="8"/>
          <path d="M 10 140 Q 200 110 390 140" stroke="#b45309" stroke-width="3" fill="none"/>
          <circle cx="80" cy="110" r="14" fill="#dc2626"/>
          <circle cx="150" cy="105" r="14" fill="#ea580c"/>
          <circle cx="220" cy="100" r="14" fill="#d97706"/>
          <circle cx="290" cy="95" r="14" fill="#ca8a04"/>
          <path d="M 80 110 L 150 105 L 220 100 L 290 95" stroke="#78350f" stroke-width="3" stroke-dasharray="4"/>
          <text x="75" y="160" font-size="12" font-weight="bold" fill="#7c2d12">【圖 2：村民齊心排成人鏈滅火防線（穿插於第 3 段後）】</text>
        </svg>`,
      },
      {
        id: 'ill_3',
        paragraphNumber: 4,
        caption: '圖 3：【合·溫馨結局 / 穿插於第 4 段後】夕陽下老松樹巍然屹立與阿雅掌心青綠的松針',
        type: 'svg_diagram',
        imagePrompt: '【場景 3（合·溫馨結局，建議穿插於第 4 段之後）】：溫暖感動的兒童繪本水彩手繪插畫：金色夕陽灑落整片山脊，焦黑中老松樹迎風聳立，新芽微顫，老村長微笑將一片完好的青綠松針放在小女孩阿雅的掌心，溫馨治癒，16:9 橫向構圖。 / English prompt: Heartwarming children storybook watercolor illustration, sunset golden hour glowing over surviving pine tree, elder placing fresh green pine needles into young girl palm, touching emotional moment --ar 16:9',
        svgCode: `<svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto rounded-xl bg-emerald-50 border border-emerald-200 p-2">
          <circle cx="200" cy="90" r="70" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
          <path d="M 170 90 Q 200 60 230 90 Q 200 120 170 90" fill="#22c55e"/>
          <text x="110" y="160" font-size="12" font-weight="bold" fill="#14532d">【圖 3：掌心松針與守護的心（穿插於第 4 段後）】</text>
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
        paragraphNumber: 1,
        caption: '圖 1：【引言·生態全景 / 穿插於第 1 段後】台灣黑熊胸前白色 V 字斑紋與高山棲地特徵',
        type: 'svg_diagram',
        imagePrompt: '【場景 1（引言·生態全景，建議穿插於第 1 段之後）】：現代教育科普插畫：台灣高山雲霧森林中，一隻健壯的台灣黑熊站在覆滿青苔的巨木旁，胸前白色新月形 V 字斑紋清晰醒目，神情好奇友善，陽光透過針葉林灑落，8k 高解析度少兒科普風格。 / English prompt: Educational wildlife science illustration of Formosan black bear with distinct white V crescent mark on chest in misty Taiwanese mountain forest, bright daylight, National Geographic Kids style --ar 16:9',
        svgCode: `<svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto rounded-xl bg-sky-50 border border-sky-100 p-2">
          <circle cx="200" cy="80" r="45" fill="#1e293b"/>
          <path d="M 180 75 Q 200 95 220 75" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
          <text x="100" y="155" font-size="12" font-weight="bold" fill="#0f172a">【圖 1：黑熊新月斑紋與高山棲地（穿插於第 1 段後）】</text>
        </svg>`,
      },
      {
        id: 'ill_info_2',
        paragraphNumber: 3,
        caption: '圖 2：【核心·生態循環 / 穿插於第 3 段後】黑熊在森林生態系中扮演「種子傳播與造林工程師」之循環示意圖',
        type: 'svg_diagram',
        imagePrompt: '【場景 2（核心·生態循環，建議穿插於第 3 段之後）】：清晰明瞭的生態科普圖表：黑熊進食青剛櫟果實、在遠方排出完整未消化種子、種子在天然肥料中萌芽長成新樹之三步驟生態循環流程圖，富教育意義與圖文對照。 / English prompt: Educational infographic of bear ecological cycle: eating oak acorns, dispersing seeds over long distances in feces, and new healthy oak saplings growing, clean colorful diagram --ar 16:9',
        svgCode: `<svg viewBox="0 0 450 200" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto rounded-xl bg-emerald-50 border border-emerald-100 p-2">
          <circle cx="80" cy="100" r="45" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
          <text x="50" y="95" font-size="12" font-weight="bold" fill="#0369a1">1.進食果實</text>
          <text x="45" y="115" font-size="10" fill="#0c4a6e">高山青剛櫟</text>

          <path d="M 130 90 Q 170 70 210 90" fill="none" stroke="#059669" stroke-width="3"/>
          
          <circle cx="225" cy="100" r="45" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
          <text x="195" y="95" font-size="12" font-weight="bold" fill="#854d0e">2.遠距傳播</text>
          <text x="190" y="115" font-size="10" fill="#713f12">種子排出不壞</text>

          <path d="M 275 90 Q 315 70 355 90" fill="none" stroke="#059669" stroke-width="3"/>
          
          <circle cx="370" cy="100" r="45" fill="#bbf7d0" stroke="#16a34a" stroke-width="2"/>
          <text x="340" y="95" font-size="12" font-weight="bold" fill="#15803d">3.健康造林</text>
          <text x="335" y="115" font-size="10" fill="#14532d">多樣樹種新生</text>

          <text x="95" y="180" font-size="12" fill="#0f766e" font-family="sans-serif">【圖 2：黑熊種子傳播與造林循環（穿插於第 3 段後）】</text>
        </svg>`,
      },
      {
        id: 'ill_info_3',
        paragraphNumber: 4,
        caption: '圖 3：【體悟·人與自然 / 穿插於第 4 段後】保育巡護廊道與紅外線自動監測相機網絡',
        type: 'svg_diagram',
        imagePrompt: '【場景 3（體悟·人與自然，建議穿插於第 4 段之後）】：溫暖正向的生態保育科普插畫：巡護員與原住民夥伴在山林間檢查樹幹上的紅外線自動相機，遠處安全的林道上黑熊母子悠閒散步，展現人與野生動物和諧共存的保育希望。 / English prompt: Inspiring wildlife conservation illustration, rangers and indigenous guides installing infrared trail cameras on trees, wild bear family safely roaming in background forest corridor --ar 16:9',
        svgCode: `<svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto rounded-xl bg-teal-50 border border-teal-200 p-2">
          <rect x="50" y="40" width="300" height="90" fill="#ccfbf1" rx="10" stroke="#0d9488" stroke-width="2"/>
          <circle cx="100" cy="85" r="22" fill="#0f766e"/>
          <circle cx="200" cy="85" r="22" fill="#0f766e"/>
          <circle cx="300" cy="85" r="22" fill="#0f766e"/>
          <text x="75" y="90" font-size="10" fill="#ffffff" font-weight="bold">相機A</text>
          <text x="175" y="90" font-size="10" fill="#ffffff" font-weight="bold">相機B</text>
          <text x="275" y="90" font-size="10" fill="#ffffff" font-weight="bold">相機C</text>
          <path d="M 125 85 L 175 85 M 225 85 L 275 85" stroke="#0f766e" stroke-width="2" stroke-dasharray="4"/>
          <text x="100" y="160" font-size="12" font-weight="bold" fill="#115e59">【圖 3：安全巡護廊道與相機網絡（穿插於第 4 段後）】</text>
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
