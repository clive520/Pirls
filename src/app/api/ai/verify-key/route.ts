import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';

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

    if (!apiKey) {
      return NextResponse.json({ error: '請輸入 Google API Key' }, { status: 400 });
    }

    // 優先測試 gemini-2.0-flash，若不支援則測試 gemini-1.5-flash
    const testResult = await testGeminiKey(apiKey);

    if (testResult.ok) {
      return NextResponse.json({
        success: true,
        model: testResult.model,
        message: `API 金鑰有效！已成功連線 Google Gemini 服務 (${testResult.model})。`,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: testResult.error || '金鑰驗證失敗',
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '伺服器驗證過程發生異常',
    }, { status: 500 });
  }
}

async function testGeminiKey(apiKey: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
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
