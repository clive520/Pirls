import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getAvailableGeminiModels } from '@/lib/llm-adapter';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * 驗證教師提供的 Google Gemini API Key 是否有效
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '請先登入系統' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ error: '無操作權限' }, { status: 403 });
    }

    const body = await req.json();
    const apiKey = (body.apiKey || '').trim();
    const preferredModel = (body.preferredModel || 'gemini-1.5-flash').trim();

    if (!apiKey) {
      return NextResponse.json({ error: '請輸入 Google API Key' }, { status: 400 });
    }

    // 先測試 models 列舉端點，快速確認金鑰合法性
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!modelsRes.ok) {
      const errData = await modelsRes.json().catch(() => null);
      const googleMsg = errData?.error?.message || modelsRes.statusText;
      return NextResponse.json({
        success: false,
        error: `Google API 金鑰驗證失敗 (${modelsRes.status}): ${googleMsg}`,
      }, { status: 400 });
    }

    // 動態獲取當前帳號可用的最新 Flash 模型，優先選擇省額度的指定模型
    const models = await getAvailableGeminiModels(apiKey, preferredModel);
    const testResult = await testGeminiKey(apiKey, models);

    if (testResult.ok) {
      const isQuotaSaver = testResult.model?.includes('1.5-flash') || testResult.model?.includes('8b');
      const quotaTip = isQuotaSaver ? '（極速、超省額度，支援每天 1,500 次免費呼叫）' : '（高速穩定）';
      return NextResponse.json({
        success: true,
        model: testResult.model,
        message: `API 金鑰有效！已成功連線 Google ${testResult.model} ${quotaTip}。`,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: testResult.error || '模型推理測試未通過',
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '伺服器驗證過程發生異常',
    }, { status: 500 });
  }
}

async function testGeminiKey(apiKey: string, models: string[]): Promise<{ ok: boolean; model?: string; error?: string }> {
  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hello, reply with pong.' }] }],
          generationConfig: {
            maxOutputTokens: 10,
          },
        }),
      });

      if (response.ok) {
        return { ok: true, model };
      }

      const errData = await response.json().catch(() => null);
      const googleMsg = errData?.error?.message || response.statusText;
      lastError = `[${model}] Google 報錯 (${response.status}): ${googleMsg}`;
    } catch (err: any) {
      lastError = `連線異常: ${err.message}`;
    }
  }

  return { ok: false, error: lastError };
}
