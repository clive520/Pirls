export function extractAndParseJSON(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('LLM 未回傳有效文字');
  }

  const trimmed = rawText.trim();

  // 1. 直接嘗試原生解析
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. 嘗試抓取 ```json ... ``` 或 ``` ... ``` 程式碼區塊
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. 尋找最外層的 { 與 } 區間（過濾模型在前後添加的對話性閒聊或故事引言）
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}

    // 4. 修復常見的 JSON 格式瑕疵（如結尾多餘逗點、控制字元）
    try {
      const sanitized = candidate
        .replace(/,\s*([}\]])/g, '$1') // 移除物件或陣列尾端多餘的逗號
        .replace(/\\'/g, "'"); // 替換無效的跳脫單引號
      return JSON.parse(sanitized);
    } catch {}
  }

  // 若仍無法解析，拋出具體友善錯誤
  const preview = trimmed.length > 80 ? trimmed.substring(0, 80) + '...' : trimmed;
  throw new Error(`AI 回傳內容無法解析為有效 JSON 試卷結構，前導內容：[${preview}]，請重新點擊生成。`);
}
