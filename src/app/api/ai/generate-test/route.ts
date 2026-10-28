import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { generatePIRLSTestPaper } from '@/lib/llm-adapter';

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
      apiKey,
      creatorId: session.userId,
      creatorName: session.displayName,
    });

    return NextResponse.json({
      success: true,
      testPaper,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '生成失敗' }, { status: 500 });
  }
}
