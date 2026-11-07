import { TestPaper } from '@/lib/types';
import { GenerateParams } from '../types';
import { buildPIRLSPrompt } from '../prompts';
import { formatToTestPaper } from '../format-paper';
import { extractAndParseJSON } from '@/lib/json-helper';

/**
 * 串接 Anthropic Claude 官方 Messages API
 * 支援 Claude 3.5 Sonnet、Claude 3.5 Haiku 等頂尖文學與修辭理解模型
 */
export async function callClaudeAPI(
  params: GenerateParams,
  apiKey: string
): Promise<TestPaper> {
  const isLiterary = params.textType === 'literary';
  const targetCount = params.questionCountMode === 'standard' ? 14 : 8;
  const { systemInstruction, userPrompt } = buildPIRLSPrompt(params, isLiterary, targetCount);

  const model =
    params.preferredModel && params.preferredModel !== 'auto'
      ? params.preferredModel
      : 'claude-3-5-sonnet-20241022';

  const systemWithJsonInstruction = `${systemInstruction}

【輸出格式強制規範】
請直接輸出合法的 JSON 物件，嚴禁包含任何額外的問候語、前導說明或結語。請確保所有 JSON 鍵名與括號完全閉合。`;

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
        model,
        max_tokens: 4096,
        temperature: 0.7,
        system: systemWithJsonInstruction,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const msg = errJson?.error?.message || errJson?.message || response.statusText;
      throw new Error(`[Claude] 服務器回應錯誤 (${response.status}): ${msg}`);
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text;

    if (!rawText) {
      throw new Error('[Claude] API 未回傳有效文字內容');
    }

    // 強健解析 JSON（自動過濾前導引言與修復語法瑕疵）
    const parsed = extractAndParseJSON(rawText);
    return formatToTestPaper(parsed, params);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('[Claude] API 響應逾時 (180秒)，請稍後再試。');
    }
    throw err;
  }
}
