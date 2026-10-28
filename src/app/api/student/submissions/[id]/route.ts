import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getSubmissionById, getTestPaperById } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const submission = await getSubmissionById(params.id);
  if (!submission) {
    return NextResponse.json({ error: '找不到該作答診斷報告' }, { status: 404 });
  }

  // 權限檢查：本人或老師/管理員可看
  if (
    session.role === 'student' &&
    submission.studentId !== session.userId
  ) {
    return NextResponse.json({ error: '您無法查看其他同學的報告' }, { status: 403 });
  }

  const testPaper = await getTestPaperById(submission.testPaperId);

  return NextResponse.json({
    submission,
    testPaper,
  });
}
