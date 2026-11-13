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

  // 取得班級平均國際量尺分數、平均原始得分與四大思維向度掌握率，供學科向度雷達圖與常模落點儀表對照
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

  if (submission.classId && submission.classId !== 'open_practice_community') {
    try {
      const { getTestPaperSubmissions } = await import('@/lib/db');
      const allSubs = await getTestPaperSubmissions(submission.testPaperId);
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
    } catch (e) {
      console.warn('[Submission API] Failed to compute class averages:', e);
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
  });
}
