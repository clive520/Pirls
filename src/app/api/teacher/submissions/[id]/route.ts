import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getSubmissionById, getTestPaperById, getTestPaperSubmissions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const submission = await getSubmissionById(params.id);
  if (!submission) {
    return NextResponse.json({ error: '找不到該作答紀錄' }, { status: 404 });
  }

  const testPaper = await getTestPaperById(submission.testPaperId);
  if (!testPaper) {
    return NextResponse.json({ error: '找不到該測驗試卷' }, { status: 404 });
  }

  // 取得同試卷所有學生作答紀錄，供教師在專屬全螢幕網頁模式下一鍵切換學生
  const allSubs = await getTestPaperSubmissions(submission.testPaperId);
  const siblings = allSubs.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    studentName: s.studentName,
    className: s.className,
    seatNumber: s.seatNumber,
    totalScore: s.totalScore,
    maxScore: s.maxScore,
    scaleScore: s.scaleScore,
    isTeacherReviewed: !!s.isTeacherReviewed,
  }));

  return NextResponse.json({
    submission,
    testPaper,
    siblings,
    currentUserId: session.userId,
    currentUserName: session.displayName,
  });
}
