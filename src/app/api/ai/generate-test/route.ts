import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { generatePIRLSTestPaper } from '@/lib/llm-adapter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Google Cloud Run 容器支援高達 600 秒長效運算，允許長文與多題目四層次深度生成

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: '請先登入系統' }, { status: 200 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ success: false, error: '無出題權限' }, { status: 200 });
    }

    const body = await req.json();
    const {
      mode,
      theme,
      pastedText,
      pastedTitle,
      targetGrade,
      textType,
      questionCountMode,
      includeDiagram,
      provider,
      apiKey,
      customBaseUrl,
      preferredModel,
    } = body;

    let finalProvider = provider || 'gemini';
    const trimmedKey = apiKey?.trim() || '';

    // 雙重保險防呆：若金鑰為 OpenRouter 格式 (sk-or-v1-) 但 provider 誤選為 gemini，自動修正為 openrouter
    if (trimmedKey.startsWith('sk-or-v1-') && finalProvider === 'gemini') {
      finalProvider = 'openrouter';
    }

    const testPaper = await generatePIRLSTestPaper({
      mode: mode || 'theme',
      theme,
      pastedText,
      pastedTitle,
      targetGrade: targetGrade ? parseInt(targetGrade, 10) : 4,
      textType: textType || 'literary',
      questionCountMode: questionCountMode || 'standard',
      includeDiagram: Boolean(includeDiagram),
      provider: finalProvider,
      apiKey: trimmedKey || undefined,
      customBaseUrl: customBaseUrl?.trim() || undefined,
      preferredModel: preferredModel || 'auto',
      creatorId: session.userId,
      creatorName: session.displayName,
    });

    return NextResponse.json({
      success: true,
      testPaper,
    }, { status: 200 });
  } catch (error: any) {
    console.error('PIRLS 出題 API 發生錯誤:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '生成失敗，請確認 API Key 是否有效或稍後重試',
    }, { status: 200 });
  }
}
