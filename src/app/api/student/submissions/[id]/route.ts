import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getSubmissionById, getTestPaperById } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const submission = await getSubmissionById(params.id);
  if (!submission) {
    return NextResponse.json({ error: '找不到該作答診斷報告' }, { status: 404 });
  }

  const token = req.cookies.get('pirls_token')?.value;
  let session = null;
  if (token) {
    session = await verifySessionToken(token);
  }

  // 若為開放自學區的訪客作答 (guest_ 或 open_practice_community)，允許免登入直接查閱
  const isGuestSubmission =
    submission.studentId.startsWith('guest_') ||
    submission.classId === 'open_practice_community';

  if (!isGuestSubmission) {
    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }
    if (!session) {
      return NextResponse.json({ error: '無存取權限' }, { status: 403 });
    }

    // 權限檢查：本人或老師/管理員可看
    if (
      session.role === 'student' &&
      submission.studentId !== session.userId
    ) {
      return NextResponse.json({ error: '您無法查看其他同學的報告' }, { status: 403 });
    }
  }

  const testPaper = await getTestPaperById(submission.testPaperId);

  return NextResponse.json({
    submission,
    testPaper,
  });
}
