import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import {
  getTestPaperById,
  createSubmission,
  getUserById,
  getTestPaperSubmissions,
  getStudentTestSubmission,
  getAssignmentById,
  getStudentSubmissions,
} from '@/lib/db';
import { gradeStudentSubmission } from '@/lib/ai-grader';
import {
  calculatePIRLSScaleScore,
  getBenchmarkInfo,
  calculatePercentileRank,
  estimateTheoreticalPR,
} from '@/lib/pirls-norm';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: '無存取權限' }, { status: 403 });
    }

    const body = await req.json();
    const { testPaperId, assignmentId, rawAnswers, durationSeconds, timeSpentSeconds, startedAt } = body;
    const finalDuration = Number(durationSeconds ?? timeSpentSeconds ?? 0) || undefined;

    if (!testPaperId || !rawAnswers) {
      return NextResponse.json({ error: '作答資料不完整' }, { status: 400 });
    }

    const testPaper = await getTestPaperById(testPaperId);
    if (!testPaper) {
      return NextResponse.json({ error: '找不到該測驗試卷' }, { status: 404 });
    }

    let assignment = null;
    if (assignmentId) {
      assignment = await getAssignmentById(assignmentId);
    }

    // 檢查作答次數限制：若教師指派設定僅限一次作答，則拒絕重複繳卷
    const allowRetake = assignment ? assignment.allowRetake : testPaper.allowRetake !== false;
    if (!allowRetake) {
      if (assignment) {
        const studentSubs = await getStudentSubmissions(session.userId);
        const existing = studentSubs.find((s) => s.assignmentId === assignment!.id);
        if (existing) {
          return NextResponse.json(
            { error: '本測驗由出題教師設定為「僅限一次作答」，您已於先前完成繳交，無法重複送出。' },
            { status: 403 }
          );
        }
      } else {
        const existing = await getStudentTestSubmission(session.userId, testPaper.id);
        if (existing) {
          return NextResponse.json(
            { error: '本測驗由出題教師設定為「僅限一次作答」，您已於先前完成繳交，無法重複送出。' },
            { status: 403 }
          );
        }
      }
    }

    // 寬容截止時間緩衝檢查：允許在截止時間前進入作答的學生完成繳交（提供最高 3 小時交卷寬容緩衝）
    if (assignment && assignment.deadlineType === 'scheduled' && assignment.dueDate) {
      const dueTime = new Date(assignment.dueDate).getTime();
      const nowTime = new Date().getTime();
      const maxGraceBufferMs = 3 * 60 * 60 * 1000; // 3 小時寬容時間
      if (nowTime > dueTime + maxGraceBufferMs) {
        return NextResponse.json(
          { error: '本測驗截止已逾時過久，系統已完全關閉接收繳卷。' },
          { status: 403 }
        );
      }
    }

    const user = await getUserById(session.userId);

    // 啟動 AI 規準批改引擎
    const gradingResult = await gradeStudentSubmission({
      testPaper,
      rawAnswers,
    });

    // 啟動 Stage 5: PIRLS 國際量尺與常模演算法換算
    const scaleScore = calculatePIRLSScaleScore(gradingResult.totalScore, gradingResult.maxScore);
    const benchmark = getBenchmarkInfo(scaleScore);

    // 班級同儕 PR 與國際/全站常模 PR 計算
    const existingSubmissions = await getTestPaperSubmissions(testPaper.id);
    const classScores = existingSubmissions.map((s) => s.totalScore);
    classScores.push(gradingResult.totalScore);

    const classPR = calculatePercentileRank(gradingResult.totalScore, classScores);
    const normPR = estimateTheoreticalPR(scaleScore);

    // 存入資料庫
    const submission = await createSubmission({
      assignmentId: assignment?.id,
      testPaperId: testPaper.id,
      testPaperTitle: testPaper.title,
      targetGrade: testPaper.targetGrade,
      textType: testPaper.textType,
      studentId: session.userId,
      studentName: session.displayName,
      classId: session.classId || 'class_default',
      className: session.className || '自主學習班',
      seatNumber: user?.seatNumber,
      totalScore: gradingResult.totalScore,
      maxScore: gradingResult.maxScore,
      percentage: gradingResult.percentage,
      scaleScore,
      benchmarkKey: benchmark.key,
      benchmarkName: benchmark.name,
      benchmarkDescription: benchmark.description,
      classPR,
      normPR,
      processScores: gradingResult.processScores,
      answers: gradingResult.answers,
      startedAt: startedAt || undefined,
      durationSeconds: finalDuration,
      reviewStatus: 'unreviewed',
    });

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      totalScore: submission.totalScore,
      maxScore: submission.maxScore,
      percentage: submission.percentage,
      scaleScore,
      benchmark: benchmark.name,
      classPR,
      normPR,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '繳交批改失敗' }, { status: 500 });
  }
}
