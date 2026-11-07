import { TestPaper } from '@/lib/types';
import { GenerateParams } from '../types';
import { buildPIRLSPrompt } from '../prompts';
import { formatToTestPaper } from '../format-paper';
import { extractAndParseJSON } from '@/lib/json-helper';

/**
 * Google 官方 Flash 文字模型優先序
 * 優先順序：Gemini 3.8 > 3.7 > 3.6 > 3.5 > 3.5-Lite > 3.1-Lite > 2.5 > 2.0
 */
export const ACTIVE_FLASH_PRIORITY = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

/**
 * 嚴格過濾非文字生成模型（語音TTS、生圖、嵌入、即時串流）
 */
function isExcludedGeminiModel(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('tts') ||
    lower.includes('audio') ||
    lower.includes('image') ||
    lower.includes('imagen') ||
    lower.includes('embed') ||
    lower.includes('realtime') ||
    lower.includes('live') ||
    lower.includes('search') ||
    lower.includes('aqa')
  );
}

/**
 * 動態探測該 API Key 當前可用且支援 generateContent 的文字推薦模型清單
 * 優先順序：Gemini 3.8 > 3.7 > 3.6 > 3.5 > 3.5-Lite > 3.1-Lite
 */
export async function getAvailableGeminiModels(apiKey: string, preferredModel?: string): Promise<string[]> {
  let preferred = (preferredModel || '').trim();
  // 若偏好模型誤存了語音/TTS 實驗模型或舊版已停用模型，一律重設為 auto
  if (preferred && (isExcludedGeminiModel(preferred) || preferred.includes('1.5'))) {
    preferred = 'auto';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (res.ok) {
      const data = await res.json();
      const activeNames: string[] = (data.models || [])
        .filter((m: any) => {
          const name = (m.name || '').replace(/^models\//, '');
          const isGeneration = Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent');
          return isGeneration && !isExcludedGeminiModel(name) && !name.includes('1.5');
        })
        .map((m: any) => m.name.replace(/^models\//, ''));

      const candidates: string[] = [];

      // 若老師指定了有效特定模型，優先作為第 1 候選
      if (preferred && preferred !== 'auto') {
        const matched = activeNames.find((n) => n === preferred || n.startsWith(`${preferred}-`));
        if (matched) candidates.push(matched);
      }

      // 依官方活躍優先級填入備援（3.8 > 3.7 > 3.6 > 3.5 > 3.5-Lite > 3.1-Lite）
      for (const m of ACTIVE_FLASH_PRIORITY) {
        if (!candidates.includes(m)) {
          const matched = activeNames.find((n) => n === m || n.startsWith(`${m}-`));
          if (matched && !candidates.includes(matched)) {
            candidates.push(matched);
          }
        }
      }

      // 若上述偏好沒對應到，從過濾後的 activeNames 挑選任何含有 flash 的純文字模型
      if (candidates.length === 0) {
        const anyFlash = activeNames.filter((n) => n.includes('flash') && !isExcludedGeminiModel(n));
        if (anyFlash.length > 0) candidates.push(...anyFlash.slice(0, 2));
      }

      // 最終保底備援
      if (!candidates.includes('gemini-3.8-flash')) candidates.push('gemini-3.8-flash');
      if (!candidates.includes('gemini-3.5-flash')) candidates.push('gemini-3.5-flash');
      if (!candidates.includes('gemini-2.5-flash')) candidates.push('gemini-2.5-flash');

      return candidates;
    }
  } catch (err) {
    // 探測逾時或異常
  }

  // 靜態備援清單（純文字現役官方模型）
  if (preferred && preferred !== 'auto' && !isExcludedGeminiModel(preferred) && !preferred.includes('1.5')) {
    const backup = preferred === 'gemini-3.8-flash' ? 'gemini-3.5-flash' : 'gemini-3.8-flash';
    return [preferred, backup, 'gemini-2.5-flash'];
  }
  return ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
}

/**
 * 遇到 Google 503 (臨時高負載) 或 429 時的自動短延遲重試機制
 */
export async function fetchWithRetry(url: string, payload: any, maxRetries = 1, timeoutMs = 55000): Promise<Response> {
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
 * 串接 Google Gemini API (放寬超時至 180 秒 + 官方最新模型自動備援)
 */
export async function callGeminiAPI(params: GenerateParams, apiKey: string): Promise<TestPaper> {
  const isLiterary = params.textType === 'literary';
  const targetCount = params.questionCountMode === 'standard' ? 14 : 8;
  const { systemInstruction, userPrompt } = buildPIRLSPrompt(params, isLiterary, targetCount);

  // 動態獲取該 API Key 可用的模型（優先匹配 2.5/2.0/1.5 Flash）
  const models = await getAvailableGeminiModels(apiKey, params.preferredModel);
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const generationConfig: any = {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 8192, // 充裕的輸出空間，確保文章與題目完整輸出
      };

      const payload = {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig,
      };

      // 單一模型等待 55 秒，若超時則自動切換至下一款備援模型（如 3.8-flash 或 3.5-flash）
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
