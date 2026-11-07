import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * 快速驗證教師提供的多 AI 提供商 API Key 是否合法有效
 * 支援：Google Gemini、OpenRouter、DeepSeek、OpenCode GO
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: '請先登入系統' }, { status: 200 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ success: false, error: '無操作權限' }, { status: 200 });
    }

    const body = await req.json();
    const provider = body.provider || 'gemini';
    const apiKey = (body.apiKey || '').trim();
    const customBaseUrl = (body.customBaseUrl || '').trim();
    const preferredModel = (body.preferredModel || 'auto').trim();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: '請輸入 API Key' }, { status: 200 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      // 1. Google Gemini 驗證
      if (provider === 'gemini') {
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        if (!modelsRes.ok) {
          const errData = await modelsRes.json().catch(() => null);
          const googleMsg = errData?.error?.message || modelsRes.statusText;
          return NextResponse.json({
            success: false,
            error: `Google API 金鑰驗證失敗 (${modelsRes.status}): ${googleMsg}`,
          }, { status: 200 });
        }

        const data = await modelsRes.json().catch(() => ({ models: [] }));
        const availableModels: string[] = (data.models || [])
          .filter((m: any) => {
            const name = ((m.name || '').replace(/^models\//, '')).toLowerCase();
            const isGeneration = Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent');
            const isExcluded =
              name.includes('tts') ||
              name.includes('audio') ||
              name.includes('image') ||
              name.includes('imagen') ||
              name.includes('embed') ||
              name.includes('realtime') ||
              name.includes('live') ||
              name.includes('search') ||
              name.includes('aqa') ||
              name.includes('1.5');
            return isGeneration && !isExcluded;
          })
          .map((m: any) => m.name.replace(/^models\//, ''));

        const topModel = availableModels.find((n) => n === 'gemini-2.5-flash')
          || availableModels.find((n) => n === 'gemini-2.0-flash')
          || availableModels.find((n) => n.startsWith('gemini-2.5-flash'))
          || availableModels.find((n) => n.startsWith('gemini-2.0-flash'))
          || availableModels.find((n) => n === 'gemini-2.5-pro')
          || availableModels.find((n) => n.includes('flash'))
          || 'gemini-2.5-flash';

        return NextResponse.json({
          success: true,
          model: topModel,
          message: `Google Gemini API 金鑰驗證成功！已成功連線推薦文字旗艦模型：${topModel}。`,
        }, { status: 200 });
      }

      // 2. Anthropic Claude 驗證
      if (provider === 'claude') {
        const modelsRes = await fetch('https://api.anthropic.com/v1/models', {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          signal: controller.signal,
        });

        if (!modelsRes.ok) {
          const errData = await modelsRes.json().catch(() => null);
          const msg = errData?.error?.message || modelsRes.statusText;
          return NextResponse.json({
            success: false,
            error: `Anthropic Claude 金鑰驗證失敗 (${modelsRes.status}): ${msg}`,
          }, { status: 200 });
        }

        return NextResponse.json({
          success: true,
          model: 'claude-3-5-sonnet-20241022',
          message: 'Anthropic Claude 官方 API 金鑰有效！支援文學修辭旗艦 Claude 3.5 Sonnet 與極速 Claude 3.5 Haiku。',
        }, { status: 200 });
      }

      // 3. OpenAI 官方 API 驗證
      if (provider === 'openai') {
        const modelsRes = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          signal: controller.signal,
        });

        if (!modelsRes.ok) {
          const errData = await modelsRes.json().catch(() => null);
          const msg = errData?.error?.message || modelsRes.statusText;
          return NextResponse.json({
            success: false,
            error: `OpenAI 官方金鑰驗證失敗 (${modelsRes.status}): ${msg}`,
          }, { status: 200 });
        }

        return NextResponse.json({
          success: true,
          model: 'gpt-4o',
          message: 'OpenAI 官方 API 金鑰有效！支援 GPT-4o、GPT-4o-mini、o3-mini 與 o1 系列模型。',
        }, { status: 200 });
      }

      // 4. Groq 極速推理驗證
      if (provider === 'groq') {
        const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          signal: controller.signal,
        });

        if (!modelsRes.ok) {
          const errData = await modelsRes.json().catch(() => null);
          const msg = errData?.error?.message || modelsRes.statusText;
          return NextResponse.json({
            success: false,
            error: `Groq 金鑰驗證失敗 (${modelsRes.status}): ${msg}`,
          }, { status: 200 });
        }

        return NextResponse.json({
          success: true,
          model: 'llama-3.1-8b-instant',
          message: 'Groq 極速推論金鑰有效！支援 Llama 3.1 8B (20,000 TPM 超大額度・2秒極速) 與 Llama 3.3 70B。',
        }, { status: 200 });
      }

      // 5. OpenRouter 驗證
      if (provider === 'openrouter') {
        const authRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://pirls-learning-system.vercel.app',
          },
          signal: controller.signal,
        });

        if (!authRes.ok) {
          const errData = await authRes.json().catch(() => null);
          const msg = errData?.error?.message || authRes.statusText;
          return NextResponse.json({
            success: false,
            error: `OpenRouter 金鑰驗證失敗 (${authRes.status}): ${msg}`,
          }, { status: 200 });
        }

        const data = await authRes.json().catch(() => null);
        const limitStr = data?.data?.limit ? ` (帳號限額: $${data.data.limit})` : '';
        return NextResponse.json({
          success: true,
          model: 'deepseek/deepseek-chat',
          message: `OpenRouter API 金鑰驗證成功！${limitStr} 可調用 Claude/GPT/DeepSeek 聚合模型。`,
        }, { status: 200 });
      }

      // 3. DeepSeek 官方 API 驗證
      if (provider === 'deepseek') {
        const modelsRes = await fetch('https://api.deepseek.com/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (!modelsRes.ok) {
          const errData = await modelsRes.json().catch(() => null);
          const msg = errData?.error?.message || modelsRes.statusText;
          return NextResponse.json({
            success: false,
            error: `DeepSeek 金鑰驗證失敗 (${modelsRes.status}): ${msg}`,
          }, { status: 200 });
        }

        return NextResponse.json({
          success: true,
          model: 'deepseek-flash',
          message: 'DeepSeek 官方 API 金鑰有效！支援 deepseek-flash (V4.1)、deepseek-chat、deepseek-v4-pro 與 deepseek-reasoner。',
        }, { status: 200 });
      }

      // 4. OpenCode GO / OpenAI 兼容端點驗證
      if (provider === 'opencode') {
        const base = customBaseUrl || 'https://api.opencode.ai/v1';
        const endpoint = base.endsWith('/models') ? base : `${base.replace(/\/+$/, '')}/models`;

        const testRes = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (!testRes.ok) {
          const errData = await testRes.json().catch(() => null);
          const msg = errData?.error?.message || testRes.statusText;
          return NextResponse.json({
            success: false,
            error: `OpenCode GO 端點驗證失敗 (${testRes.status}): ${msg}`,
          }, { status: 200 });
        }

        return NextResponse.json({
          success: true,
          model: 'deepseek-chat',
          message: 'OpenCode GO API Key 與端點驗證成功！連線正常。',
        }, { status: 200 });
      }

      return NextResponse.json({ success: false, error: '未知的提供商類型' }, { status: 200 });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    const isTimeout = error.name === 'AbortError';
    return NextResponse.json({
      success: false,
      error: isTimeout ? '連線驗證逾時 (8秒)，請檢查網路或 API Key' : (error.message || '伺服器驗證過程發生異常'),
    }, { status: 200 });
  }
}
