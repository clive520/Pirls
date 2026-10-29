import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * 快速驗證教師提供的 Google Gemini API Key 是否合法有效
 * 採用輕量級 GET /v1beta/models 端點，300 毫秒內即可完成授權檢驗，且不消耗任何生成額度
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
    const apiKey = (body.apiKey || '').trim();
    const preferredModel = (body.preferredModel || 'gemini-1.5-flash').trim();

    if (!apiKey) {
      return NextResponse.json({ success: false, error: '請輸入 Google API Key' }, { status: 200 });
    }

    // 發送超輕量 GET 請求檢測金鑰有效性 (設定 8 秒超時防線)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!modelsRes.ok) {
      const errData = await modelsRes.json().catch(() => null);
      const googleMsg = errData?.error?.message || modelsRes.statusText;
      return NextResponse.json({
        success: false,
        error: `Google API 金鑰無效或受限 (${modelsRes.status}): ${googleMsg}`,
      }, { status: 200 });
    }

    const data = await modelsRes.json().catch(() => ({ models: [] }));
    const availableModels: string[] = (data.models || [])
      .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m: any) => m.name.replace(/^models\//, ''))
      .filter((n: string) => !n.includes('2.0') && !n.includes('2.5')); // 嚴格過濾已下線的 2.0 與已停用新戶的 2.5

    const topModel = availableModels.find((n) => n.includes('3.8-flash')) 
      || availableModels.find((n) => n.includes('3.6-flash'))
      || availableModels[0] 
      || 'gemini-3.8-flash';

    return NextResponse.json({
      success: true,
      model: topModel,
      availableModels: availableModels.slice(0, 3),
      message: `API 金鑰有效！已成功驗證 Google Gemini 授權（官方建議活躍模型：${topModel}）。`,
    }, { status: 200 });

  } catch (error: any) {
    const isTimeout = error.name === 'AbortError';
    return NextResponse.json({
      success: false,
      error: isTimeout ? '連線 Google 逾時，請確認外網或防火牆連線是否正常' : (error.message || '伺服器驗證過程發生異常'),
    }, { status: 200 });
  }
}
