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

  // 計算該班級在此試卷的平均國際量尺分數與平均得分
  let classAvgScaleScore: number | undefined = undefined;
  let classAvgScore: number | undefined = undefined;
  if (submission.classId) {
    const classSubs = allSubs.filter((s) => s.classId === submission.classId);
    if (classSubs.length > 0) {
      classAvgScaleScore = Math.round(
        classSubs.reduce((acc, s) => acc + (s.scaleScore || 500), 0) / classSubs.length
      );
      classAvgScore =
        Math.round(
          (classSubs.reduce((acc, s) => acc + s.totalScore, 0) / classSubs.length) * 10
        ) / 10;
    }
  }

  return NextResponse.json({
    submission: {
      ...submission,
      classAvgScaleScore,
      classAvgScore,
    },
    testPaper,
    siblings,
    currentUserId: session.userId,
    currentUserName: session.displayName,
  });
}
