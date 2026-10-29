import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { generatePIRLSTestPaper } from '@/lib/llm-adapter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 允許長文與 14 題四層次題目深層生成 (上限 60 秒)

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '請先登入系統' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ error: '無出題權限' }, { status: 403 });
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
      apiKey,
      preferredModel,
    } = body;

    const testPaper = await generatePIRLSTestPaper({
      mode: mode || 'theme',
      theme,
      pastedText,
      pastedTitle,
      targetGrade: targetGrade ? parseInt(targetGrade, 10) : 4,
      textType: textType || 'literary',
      questionCountMode: questionCountMode || 'standard',
      includeDiagram: Boolean(includeDiagram),
      apiKey: apiKey?.trim() || undefined,
      preferredModel: preferredModel || 'gemini-1.5-flash',
      creatorId: session.userId,
      creatorName: session.displayName,
    });

    return NextResponse.json({
      success: true,
      testPaper,
    });
  } catch (error: any) {
    console.error('PIRLS 出題 API 發生錯誤:', error);
    return NextResponse.json({
      error: error.message || '生成失敗，請確認 API Key 是否有效或網路連線正常',
    }, { status: 500 });
  }
}
