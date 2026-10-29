/**
 * PIRLS 智慧評量系統 - 超強健 JSON 解析與容錯修復模組 (Robust JSON Extractor & Auto-Repair)
 * 專為大語言模型 (LLM) 生成試卷設計：
 * 1. 自動過濾模型在最外層添加的閒聊、故事引言或前導問候。
 * 2. 自動過濾 Markdown ```json ... ``` 代碼圍欄。
 * 3. 自動修復字串內部未跳脫的控制字元（如文章內的實體換行符 \n、\r、\t）。
 * 4. 自動修復尾端多餘逗號（Trailing Commas）與非標準單引號。
 * 5. 自動修復因輸出 Token 上限被意外截斷的 JSON（Auto-close truncated brackets/quotes）。
 */

function sanitizeJsonControlChars(str: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (isEscaped) {
      result += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      if (inString) isEscaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        const code = char.charCodeAt(0);
        if (code < 32) {
          result += ' ';
        } else {
          result += char;
        }
      }
    } else {
      result += char;
    }
  }
  return result;
}

function repairTruncatedJSON(jsonStr: string): string {
  let inString = false;
  let isEscaped = false;
  const stack: ('{' | '[')[] = [];

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      if (inString) isEscaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  let repaired = jsonStr;
  // 若中途截斷在字串中，補齊右雙引號
  if (inString) {
    repaired += '"';
  }

  // 移除尾端殘留的逗號、冒號或不完整的鍵名（例如 "key": 或 "key"）
  repaired = repaired.replace(/,\s*$/, '');
  repaired = repaired.replace(/"[^"]*"\s*:\s*$/, '');
  repaired = repaired.replace(/,\s*$/, '');

  // 依序反向閉合所有未閉合的花括號與方括號
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === '{') repaired += '}';
    else if (open === '[') repaired += ']';
  }

  return repaired;
}

export function extractAndParseJSON(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('LLM 未回傳有效文字');
  }

  const trimmed = rawText.trim();

  // 1. 直接嘗試原生解析
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. 嘗試抓取 ```json ... ``` 代碼區塊
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  let candidate = (codeBlockMatch && codeBlockMatch[1]) ? codeBlockMatch[1].trim() : trimmed;

  // 3. 尋找最外層的 { 開始（過濾模型在前後添加的對話性閒聊、故事引言）
  const firstBrace = candidate.indexOf('{');
  if (firstBrace !== -1) {
    candidate = candidate.substring(firstBrace);
  }

  try {
    return JSON.parse(candidate);
  } catch {}

  // 4. 清理並跳脫字串內的實體控制字元（如文章內的換行 \n、\r、\t）
  let sanitized = sanitizeJsonControlChars(candidate);
  try {
    return JSON.parse(sanitized);
  } catch {}

  // 5. 修復常見尾端多餘逗號與無效單引號
  sanitized = sanitized
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\\'/g, "'");
  try {
    return JSON.parse(sanitized);
  } catch {}

  // 6. 截斷修復（若模型輸出達 Token 上限提前中斷，自動閉合殘存括號）
  const repaired = repairTruncatedJSON(sanitized);
  try {
    return JSON.parse(repaired);
  } catch {}

  // 7. 閉合後的最終過濾（避免閉合處產生多餘逗點）
  const finalPass = repaired.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(finalPass);
  } catch {}

  // 若經歷 7 道嚴格修復工序仍無法解析，拋出具體友善錯誤
  const preview = trimmed.length > 100 ? trimmed.substring(0, 100) + '...' : trimmed;
  throw new Error(`AI 回傳內容無法解析為有效 JSON 試卷結構，前導內容：[${preview}]，請重新點擊生成。`);
}
