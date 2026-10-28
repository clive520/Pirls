import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTestPaperById, createSubmission, getUserById, getTestPaperSubmissions } from '@/lib/db';
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
    const { testPaperId, rawAnswers } = body;

    if (!testPaperId || !rawAnswers) {
      return NextResponse.json({ error: '作答資料不完整' }, { status: 400 });
    }

    const testPaper = await getTestPaperById(testPaperId);
    if (!testPaper) {
      return NextResponse.json({ error: '找不到該測驗試卷' }, { status: 404 });
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
