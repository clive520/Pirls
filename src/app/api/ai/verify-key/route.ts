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
          .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map((m: any) => m.name.replace(/^models\//, ''))
          .filter((n: string) => !n.includes('2.0') && !n.includes('2.5'));

        const topModel = availableModels.find((n) => n.includes('3.8-flash'))
          || availableModels.find((n) => n.includes('3.6-flash'))
          || availableModels.find((n) => n.includes('1.5-flash'))
          || availableModels[0]
          || 'gemini-3.8-flash';

        return NextResponse.json({
          success: true,
          model: topModel,
          message: `Google Gemini API 金鑰驗證成功！已連線官方活躍推薦模型：${topModel}。`,
        }, { status: 200 });
      }

      // 2. OpenRouter 驗證
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
