import { TestPaper } from '@/lib/types';
import { GenerateParams } from '../types';
import { buildPIRLSPrompt } from '../prompts';
import { formatToTestPaper } from '../format-paper';
import { extractAndParseJSON } from '@/lib/json-helper';

/**
 * Anthropic Claude 官方模型優先序
 * 優先採用新一代主力：Sonnet 5.5 > Opus 5.5 > Haiku 5.5 > Fable 5.1
 */
export const ACTIVE_CLAUDE_PRIORITY = [
  'claude-sonnet-5-5',
  'claude-opus-5-5',
  'claude-haiku-5-5',
  'claude-fable-5-1',
  'claude-sonnet-5',
  'claude-opus-5',
];

/**
 * 串接 Anthropic Claude 官方 Messages API
 * 支援新一代主力模型：Claude Sonnet 5.5、Claude Opus 5.5、Claude Haiku 5.5、Claude Fable 5.1
 */
export async function callClaudeAPI(
  params: GenerateParams,
  apiKey: string
): Promise<TestPaper> {
  const isLiterary = params.textType === 'literary';
  const targetCount = params.questionCountMode === 'standard' ? 14 : 8;
  const { systemInstruction, userPrompt } = buildPIRLSPrompt(params, isLiterary, targetCount);

  // 規範與升級模型：若偏好為舊版 3.5 或即將於 2026/11 停用的 4.5，自動平滑升級為 Sonnet 5.5
  let preferred = (params.preferredModel || '').trim();
  if (!preferred || preferred === 'auto' || preferred.includes('3-5') || preferred.includes('4-5')) {
    preferred = 'claude-sonnet-5-5';
  }

  const systemWithJsonInstruction = `${systemInstruction}

【輸出格式強制規範】
請直接輸出合法的 JSON 物件，嚴禁包含任何額外的問候語、前導說明或結語。請確保所有 JSON 鍵名與括號完全閉合。`;

  // 執行單次 API 請求
  const executeCall = async (targetModel: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000); // 180 秒長效運算防護

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 4096,
          temperature: 0.7,
          system: systemWithJsonInstruction,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      }).finally(() => clearTimeout(timer));

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const msg = errJson?.error?.message || errJson?.message || response.statusText;
        return { ok: false, status: response.status, msg, text: '' };
      }

      const data = await response.json();
      const rawText = data?.content?.[0]?.text;
      if (!rawText) {
        return { ok: false, status: 500, msg: 'API 未回傳有效文字內容', text: '' };
      }

      return { ok: true, status: 200, msg: '', text: rawText };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { ok: false, status: 408, msg: 'API 響應逾時 (180秒)，請稍後再試。', text: '' };
      }
      return { ok: false, status: 500, msg: err.message, text: '' };
    }
  };

  // 第一次呼叫偏好模型
  let callResult = await executeCall(preferred);

  // 若遇到模型找不到 (404) 或停用 (400)，自動降級重試官方旗艦 Sonnet 5.5
  if (!callResult.ok && preferred !== 'claude-sonnet-5-5') {
    const isModelUnavailable =
      callResult.status === 404 ||
      callResult.status === 400 ||
      callResult.msg.toLowerCase().includes('not_found') ||
      callResult.msg.toLowerCase().includes('model');

    if (isModelUnavailable) {
      console.warn(`[Claude] ${preferred} 呼叫失敗 (${callResult.status})，自動無縫切換為備援旗艦 claude-sonnet-5-5...`);
      callResult = await executeCall('claude-sonnet-5-5');
    }
  }

  if (!callResult.ok) {
    throw new Error(`[Claude] 服務器回應錯誤 (${callResult.status}): ${callResult.msg}`);
  }

  // 強健解析 JSON（自動過濾前導引言與修復語法瑕疵）
  const parsed = extractAndParseJSON(callResult.text);
  return formatToTestPaper(parsed, params);
}
