import { NextRequest, NextResponse } from 'next/server';
import { getTestPaperById, createSubmission } from '@/lib/db';
import { gradeStudentSubmission } from '@/lib/ai-grader';
import {
  calculatePIRLSScaleScore,
  getBenchmarkInfo,
  estimateTheoreticalPR,
} from '@/lib/pirls-norm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { testPaperId, rawAnswers, nickname } = body;

    if (!testPaperId || !rawAnswers) {
      return NextResponse.json({ error: '作答資料不完整' }, { status: 400 });
    }

    const testPaper = await getTestPaperById(testPaperId);
    if (!testPaper) {
      return NextResponse.json({ error: '找不到該測驗試卷' }, { status: 404 });
    }

    // 啟動 AI 規準批改引擎
    const gradingResult = await gradeStudentSubmission({
      testPaper,
      rawAnswers,
    });

    // 啟動 PIRLS 國際量尺與常模演算法換算
    const scaleScore = calculatePIRLSScaleScore(gradingResult.totalScore, gradingResult.maxScore);
    const benchmark = getBenchmarkInfo(scaleScore);
    const normPR = estimateTheoreticalPR(scaleScore);

    // 存入資料庫
    const submission = await createSubmission({
      testPaperId: testPaper.id,
      testPaperTitle: testPaper.title,
      targetGrade: testPaper.targetGrade,
      textType: testPaper.textType,
      studentId: `guest_${Date.now()}`,
      studentName: nickname?.trim() || '自主學習同學',
      classId: 'open_practice_community',
      className: '開放自學體驗區',
      totalScore: gradingResult.totalScore,
      maxScore: gradingResult.maxScore,
      percentage: gradingResult.percentage,
      scaleScore,
      benchmarkKey: benchmark.key,
      benchmarkName: benchmark.name,
      benchmarkDescription: benchmark.description,
      classPR: normPR, // 自學者同儕 PR 參照常模
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
      normPR,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '自學批改失敗' }, { status: 500 });
  }
}
