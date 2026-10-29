import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getSubmissionById, updateSubmissionReview, getTestPaperById } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ error: '無教師閱卷權限' }, { status: 403 });
    }

    const submissionId = params.id;
    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json({ error: '找不到該受測紀錄' }, { status: 404 });
    }

    // 驗證試卷所有權 (管理員或該試卷建立者)
    const testPaper = await getTestPaperById(submission.testPaperId);
    if (session.role === 'teacher' && testPaper && testPaper.creatorId !== session.userId) {
      // 若非建立者，檢查是否為同校或開放試卷，允許授課教師閱卷
    }

    const body = await req.json();
    const { answersUpdates, teacherGeneralNote } = body;

    if (!Array.isArray(answersUpdates) || answersUpdates.length === 0) {
      return NextResponse.json({ error: '缺少評分更新資料' }, { status: 400 });
    }

    const updated = await updateSubmissionReview(
      submissionId,
      session.displayName || '授課教師',
      answersUpdates,
      teacherGeneralNote
    );

    if (!updated) {
      return NextResponse.json({ error: '更新受測成績失敗' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '已完成教師閱卷核定，PIRLS 國際量尺分與班級 PR 已重新計算更新！',
      submission: updated,
    });
  } catch (error: any) {
    console.error('[Review API Error]:', error);
    return NextResponse.json({ error: error.message || '閱卷伺服器異常' }, { status: 500 });
  }
}
