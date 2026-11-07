import { TestPaper } from '@/lib/types';
import { GenerateParams, AIProvider } from '../types';
import { buildPIRLSPrompt } from '../prompts';
import { formatToTestPaper } from '../format-paper';
import { extractAndParseJSON } from '@/lib/json-helper';

/**
 * 串接 OpenAI 相容介面（支援 OpenRouter、DeepSeek、OpenCode GO）
 */
export async function callOpenAICompatibleAPI(
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

  if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/chat/completions';
    defaultModel = 'gpt-4o';
  } else if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    defaultModel = 'llama-3.3-70b-versatile';
  } else if (provider === 'openrouter') {
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
        max_tokens: provider === 'groq' ? 4096 : 8192,
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
