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

  // 計算該班級在此試卷的平均國際量尺分數、平均得分與四大思維向度掌握率，供學科向度雷達圖對照
  let classAvgScaleScore: number | undefined = undefined;
  let classAvgScore: number | undefined = undefined;
  let classProcessScores:
    | {
        level1: { earned: number; total: number; percentage: number };
        level2: { earned: number; total: number; percentage: number };
        level3: { earned: number; total: number; percentage: number };
        level4: { earned: number; total: number; percentage: number };
      }
    | undefined = undefined;

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

      const calcClassLevel = (lvl: 'level1' | 'level2' | 'level3' | 'level4') => {
        const valid = classSubs.filter((s) => s.processScores?.[lvl]);
        if (valid.length === 0) return { percentage: 0, earned: 0, total: 0 };
        const sumPct = valid.reduce((acc, s) => acc + (s.processScores[lvl]?.percentage || 0), 0);
        const sumEarned = valid.reduce((acc, s) => acc + (s.processScores[lvl]?.earned || 0), 0);
        const sumTotal = valid.reduce((acc, s) => acc + (s.processScores[lvl]?.total || 0), 0);
        return {
          percentage: Math.round(sumPct / valid.length),
          earned: Math.round((sumEarned / valid.length) * 10) / 10,
          total: Math.round((sumTotal / valid.length) * 10) / 10,
        };
      };

      classProcessScores = {
        level1: calcClassLevel('level1'),
        level2: calcClassLevel('level2'),
        level3: calcClassLevel('level3'),
        level4: calcClassLevel('level4'),
      };
    }
  }

  return NextResponse.json({
    submission: {
      ...submission,
      classAvgScaleScore,
      classAvgScore,
      classProcessScores,
    },
    testPaper,
    siblings,
    currentUserId: session.userId,
    currentUserName: session.displayName,
  });
}
