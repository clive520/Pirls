import { GenerateParams } from './types';

/**
 * 構建標準 PIRLS 命題提示詞與結構規範
 */
export function buildPIRLSPrompt(params: GenerateParams, isLiterary: boolean, targetCount: number) {
  const includeDiagram = params.includeDiagram !== false;
  const isPasteMode = params.mode === 'paste';

  const schemaExampleTheme = `{
  "title": "文章標題",
  "themeSummary": "文章主旨與核心素養摘要",
  "wordCount": 950,
  "articleContent": "完整文章內容...",
  "paragraphs": [
    { "paragraphNumber": 1, "text": "【第一段】..." },
    { "paragraphNumber": 2, "text": "【第二段】..." }
  ],
  "illustrations": [
    {
      "id": "ill_1",
      "paragraphNumber": 1,
      "caption": "圖 1：【起·開端情境 / 穿插於第 1 段後】金爺爺親切與孩子們交流",
      "type": "illustration_url",
      "imagePrompt": "溫馨細緻的兒童繪本水彩手繪插畫：和藹的金爺爺在古樸老鐘錶行門口向學童解說鐘錶齒輪，暖陽灑落、柔和明亮、充滿童趣與故事溫度，16:9 橫向構圖。 / English: Watercolor children storybook illustration of kind elderly Grandpa Jin explaining clock gears to kids, warm soft lighting --ar 16:9"
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
      "caption": "圖 1：【起·開端情境 / 穿插於第 1 段後】關鍵場景",
      "type": "illustration_url",
      "imagePrompt": "溫馨細緻的兒童繪本水彩手繪插畫：... / English: Storybook watercolor illustration of ... --ar 16:9"
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
6. 【PIRLS 多模態課文配圖】：
   ${includeDiagram ? `本次任務已啟用多模態配圖需求。課文插圖應依情節發展穿插於文章合適段落之後（不可全部堆在開頭）。請在 "illustrations" 陣列中產出 3 組分開的「專屬繪圖提示詞 (imagePrompt)」與圖說 (caption)：
   - 圖 1【起·開端，paragraphNumber: 1】：開端情境與角色，穿插於第 1 段後。
   - 圖 2【承轉·高潮，paragraphNumber 設為中間段落】：核心衝突挑戰，穿插於中段後。
   - 圖 3【合·結局，paragraphNumber 設為結尾段落】：問題解決與體悟，穿插於末段後。
   - 每組提示詞皆需包含中英文雙語提示詞（溫馨兒童繪本水彩風、16:9 橫向構圖、type: "illustration_url"）。` : `本次任務不需插圖，"illustrations" 欄位請輸出空陣列 []。`}
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
6. 【PIRLS 多模態課文配圖】：
   ${includeDiagram ? `本次任務已啟用多模態配圖需求。課文插圖應依情節發展穿插於文章合適段落之後（不可全部堆在開頭）。請在 "illustrations" 陣列中產出 3 組分開的「專屬繪圖提示詞 (imagePrompt)」與圖說 (caption)：
   - 圖 1【起·開端，paragraphNumber: 1】：開端情境與角色，穿插於第 1 段後。
   - 圖 2【承轉·高潮，paragraphNumber 設為中間段落】：核心衝突挑戰，穿插於中段後。
   - 圖 3【合·結局，paragraphNumber 設為結尾段落】：問題解決與體悟，穿插於末段後。
   - 每組提示詞皆需包含中英文雙語提示詞（溫馨兒童繪本水彩風、16:9 橫向構圖、type: "illustration_url"）。` : `本次任務不需插圖，"illustrations" 欄位請輸出空陣列 []。`}
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
