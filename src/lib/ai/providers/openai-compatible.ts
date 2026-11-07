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
    defaultModel = 'openai/gpt-oss-120b';
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    headers['HTTP-Referer'] = 'https://pirls-ii5od75k6a-de.a.run.app';
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

  let model = (params.preferredModel && params.preferredModel !== 'auto')
    ? params.preferredModel
    : defaultModel;

  // 動態分配最大生成 Token 上限
  let currentMaxTokens = 4096;
  if (provider === 'groq') {
    // 實測唯一穩定可用之 openai/gpt-oss-120b 擁有 65,536 輸出 Token 上限與充足限額，配置完整 4,096 tokens
    // 若特定舊模型有 TPM 限額則動態調控
    currentMaxTokens = (model.includes('70b') && !model.includes('120b')) ? 2800 : 4096;
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

  // 【Groq 獨家智慧自癒機制】：使用者線上實測 Groq 唯一穩定可用之主力為 openai/gpt-oss-120b
  // 若使用其他模型遇 400、404、413 或 429 等任何異常，自動無縫切換至實測唯一可用的旗艦主力 openai/gpt-oss-120b
  if (!callResult.ok && provider === 'groq' && model !== 'openai/gpt-oss-120b') {
    console.warn(`[Groq] ${model} 呼叫失敗 (${callResult.status}: ${callResult.msg})，自動無縫切換為實測唯一可用之旗艦主力 openai/gpt-oss-120b 重新生成...`);
    callResult = await executeCall('openai/gpt-oss-120b', 4096);
  }

  // 【DeepSeek 智慧自癒與雙向相容機制】：
  // 相容官方標準 deepseek-chat 與新世代 deepseek-flash。若遇到 400/404 模型不存在錯誤，自動雙向切換重試
  if (!callResult.ok && provider === 'deepseek') {
    const isModelNotFound =
      callResult.status === 404 ||
      (callResult.status === 400 && (
        callResult.msg.toLowerCase().includes('model') ||
        callResult.msg.toLowerCase().includes('not exist') ||
        callResult.msg.toLowerCase().includes('invalid')
      ));

    if (isModelNotFound) {
      const fallbackModel = (model === 'deepseek-flash' || model === 'deepseek-v4-pro')
        ? 'deepseek-chat'
        : 'deepseek-flash';
      console.warn(`[DeepSeek] 模型 ${model} 呼叫失敗 (${callResult.status}: ${callResult.msg})，自動切換至備援相容模型 ${fallbackModel} 重新生成...`);
      callResult = await executeCall(fallbackModel, currentMaxTokens);
    }
  }

  if (!callResult.ok) {
    if (provider === 'deepseek' && (callResult.status === 402 || callResult.msg.toLowerCase().includes('insufficient balance'))) {
      throw new Error(`[DEEPSEEK] 帳戶餘額不足 (402 Insufficient Balance)。DeepSeek API 為預付費扣款機制（無永久免費額度）。請前往 DeepSeek 開放平台 (https://platform.deepseek.com/top_up) 進行儲值充值，或切換至實測可用的 Groq（免費極速）或 Google Gemini（每日 1,500 次免費）。`);
    }
    throw new Error(`[${provider.toUpperCase()}] 服務器回應錯誤 (${callResult.status}): ${callResult.msg}`);
  }

  const rawText = callResult.data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error(`[${provider.toUpperCase()}] 未回傳有效文字內容`);

  // 強健解析 JSON（自動過濾前導引言與修復語法瑕疵）
  const parsed = extractAndParseJSON(rawText);
  return formatToTestPaper(parsed, params);
}
