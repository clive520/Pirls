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
    defaultModel = 'gpt-4o-mini';
  } else if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    defaultModel = 'llama-3.1-8b-instant';
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

  let model = (params.preferredModel && params.preferredModel !== 'auto')
    ? params.preferredModel
    : defaultModel;

  // 動態分配最大生成 Token 上限（防範 Groq 免費額度 6,000 TPM 限速）
  let currentMaxTokens = 4096;
  if (provider === 'groq') {
    // 若為 70B 或 120B 大型推理模型，將預算控制在 2,800 tokens 確保 prompt+max_tokens < 6,000 TPM
    // 8B 或 20B 模型 TPM 高達 20,000，可放心配置 4,096 tokens
    currentMaxTokens = (model.includes('70b') || model.includes('120b')) ? 2800 : 4096;
  }

  // 封裝單次呼叫流程
  const executeCall = async (targetModel: string, tokensLimit: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000); // 180 秒（3 分鐘）長效運算防護

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: targetModel,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: tokensLimit,
        }),
      }).finally(() => clearTimeout(timer));

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const msg = errJson?.error?.message || errJson?.message || response.statusText;
        return { ok: false, status: response.status, msg, data: null };
      }

      const resText = await response.text();
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch (parseErr: any) {
        const contentMatch = resText.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"finish_reason"/);
        if (contentMatch && contentMatch[1]) {
          try {
            const unescaped = JSON.parse(`"${contentMatch[1]}"`);
            data = { choices: [{ message: { content: unescaped } }] };
          } catch {
            return { ok: false, status: 500, msg: `JSON 格式異常: ${parseErr.message}`, data: null };
          }
        } else {
          return { ok: false, status: 500, msg: `回應格式異常: ${parseErr.message}`, data: null };
        }
      }

      return { ok: true, status: 200, msg: '', data };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { ok: false, status: 408, msg: 'API 響應逾時 (180秒)', data: null };
      }
      return { ok: false, status: 500, msg: err.message, data: null };
    }
  };

  // 執行第一次呼叫
  let callResult = await executeCall(model, currentMaxTokens);

  // 【Groq 獨家智慧自癒機制】：若調用 70B 模型遇 413 (Request too large) 或 429 (Rate limit reached TPM)
  // 自動無縫降級至超大 20,000 TPM 限額的 Llama 3.1 8B Instant 重新生成，絕不讓教師面臨死機錯誤！
  if (!callResult.ok && provider === 'groq' && model !== 'llama-3.1-8b-instant') {
    const isRateOrSizeLimit =
      callResult.status === 413 ||
      callResult.status === 429 ||
      callResult.msg.toLowerCase().includes('rate limit') ||
      callResult.msg.toLowerCase().includes('tpm') ||
      callResult.msg.toLowerCase().includes('too large');

    if (isRateOrSizeLimit) {
      console.warn(`[Groq] ${model} 觸發 TPM 速率限制 (${callResult.status})，自動無縫切換為 20,000 TPM 之 Llama 3.1 8B Instant 備援生成...`);
      callResult = await executeCall('llama-3.1-8b-instant', 4096);
    }
  }

  if (!callResult.ok) {
    throw new Error(`[${provider.toUpperCase()}] 服務器回應錯誤 (${callResult.status}): ${callResult.msg}`);
  }

  const rawText = callResult.data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error(`[${provider.toUpperCase()}] 未回傳有效文字內容`);

  // 強健解析 JSON（自動過濾前導引言與修復語法瑕疵）
  const parsed = extractAndParseJSON(rawText);
  return formatToTestPaper(parsed, params);
}
