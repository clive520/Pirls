import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getSubmissionById, getTestPaperById, saveSubmissionDirectly, getTestPaperSubmissions } from '@/lib/db';
import { regradeQuestionWithAI } from '@/lib/gemini-regrader';
import {
  calculatePIRLSScaleScore,
  getBenchmarkInfo,
  estimateTheoreticalPR,
  calculatePercentileRank,
} from '@/lib/pirls-norm';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 允許單人試卷之各簡答題逐一深入審題

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

    const testPaper = await getTestPaperById(submission.testPaperId);
    if (!testPaper) {
      return NextResponse.json({ error: '找不到對應試卷' }, { status: 404 });
    }

    // 篩選全卷開放簡答題
    const constructedAnswers = submission.answers.filter(
      (a) => a.type === 'constructed_response'
    );

    let regradedCount = 0;

    // 逐題調用 AI 進行深度語意審核與規準對齊
    for (const ans of constructedAnswers) {
      const q = testPaper.questions.find((item) => item.id === ans.questionId);
      if (!q) continue;

      try {
        const regradeRes = await regradeQuestionWithAI({
          testPaper,
          question: q,
          studentAnswer: ans.studentAnswer || '',
        });

        if (regradeRes) {
          const original = ans.originalScore !== undefined ? ans.originalScore : ans.score;
          const validScore = Math.max(0, Math.min(ans.points, Number(regradeRes.suggestedScore)));

          ans.originalScore = original;
          ans.score = validScore;
          ans.code = regradeRes.scoreCode;
          ans.aiRegraded = true;
          ans.aiRegradeSuggestion = {
            suggestedScore: validScore,
            reason: regradeRes.reason,
            evidenceFound: regradeRes.keyEvidenceFound,
            improvedFeedback: regradeRes.improvedFeedback,
          };
          regradedCount++;
        }
      } catch (qErr) {
        console.warn(`[Auto-Regrade] 題目 ${q.questionNumber} AI 審閱跳過:`, qErr);
      }
    }

    // 重新彙整四層次得分與全卷總分
    const processEarned = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const processTotal = { 1: 0, 2: 0, 3: 0, 4: 0 };

    for (const ans of submission.answers) {
      const pLevel = ans.processLevelNumber as 1 | 2 | 3 | 4;
      processEarned[pLevel] += ans.score;
      processTotal[pLevel] += ans.points;
    }

    const totalScore = Object.values(processEarned).reduce((a, b) => a + b, 0);
    const maxScore = submission.maxScore;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // 重新計算 PIRLS 國際量尺與常模
    const scaleScore = calculatePIRLSScaleScore(totalScore, maxScore);
    const benchmark = getBenchmarkInfo(scaleScore);
    const normPR = estimateTheoreticalPR(scaleScore);

    // 標記複閱三態：AI 複閱完成
    submission.totalScore = totalScore;
    submission.percentage = percentage;
    submission.scaleScore = scaleScore;
    submission.benchmarkKey = benchmark.key;
    submission.benchmarkName = benchmark.name;
    submission.benchmarkDescription = benchmark.description;
    submission.normPR = normPR;
    submission.reviewStatus = 'ai_reviewed';
    submission.reviewedByRole = 'ai';
    submission.reviewedBy = 'AI 智慧複閱';
    submission.aiReviewedAt = new Date().toISOString();

    submission.processScores = {
      level1: {
        earned: processEarned[1],
        total: processTotal[1],
        percentage: processTotal[1] > 0 ? Math.round((processEarned[1] / processTotal[1]) * 100) : 0,
      },
      level2: {
        earned: processEarned[2],
        total: processTotal[2],
        percentage: processTotal[2] > 0 ? Math.round((processEarned[2] / processTotal[2]) * 100) : 0,
      },
      level3: {
        earned: processEarned[3],
        total: processTotal[3],
        percentage: processTotal[3] > 0 ? Math.round((processEarned[3] / processTotal[3]) * 100) : 0,
      },
      level4: {
        earned: processEarned[4],
        total: processTotal[4],
        percentage: processTotal[4] > 0 ? Math.round((processEarned[4] / processTotal[4]) * 100) : 0,
      },
    };

    // 重新計算同試卷同儕 PR
    try {
      const siblings = await getTestPaperSubmissions(submission.testPaperId);
      const allScores = siblings.map((s) => (s.id === submission.id ? totalScore : s.totalScore));
      submission.classPR = calculatePercentileRank(totalScore, allScores);
    } catch (e) {
      console.warn('[Auto-Regrade] 重新計算同儕 PR 略過:', e);
    }

    // 儲存至本地 DB 與 Firestore
    const updated = await saveSubmissionDirectly(submission);

    return NextResponse.json({
      success: true,
      message: `已順利完成 ${submission.studentName} 的 AI 深度再閱卷核定！`,
      submission: updated,
      regradedCount,
    });
  } catch (error: any) {
    console.error('[Auto-Regrade All API Error]:', error);
    return NextResponse.json({ error: error.message || 'AI 自動再閱卷異常' }, { status: 500 });
  }
}
