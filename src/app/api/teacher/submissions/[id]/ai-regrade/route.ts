import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getSubmissionById, getTestPaperById } from '@/lib/db';
import { regradeQuestionWithAI } from '@/lib/gemini-regrader';

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

    const body = await req.json().catch(() => ({}));
    const { questionId } = body;

    // 篩選欲重新評閱之題目 (若指定 questionId 則只針對該題，否則針對全卷開放簡答題)
    const targetAnswers = questionId
      ? submission.answers.filter((a) => a.questionId === questionId)
      : submission.answers.filter((a) => a.type === 'constructed_response');

    if (targetAnswers.length === 0) {
      return NextResponse.json({ error: '找不到欲再閱之開放簡答題' }, { status: 400 });
    }

    const regradeResults = [];

    for (const ans of targetAnswers) {
      const q = testPaper.questions.find((item) => item.id === ans.questionId);
      if (!q) continue;

      const result = await regradeQuestionWithAI({
        testPaper,
        question: q,
        studentAnswer: ans.studentAnswer,
      });

      regradeResults.push({
        ...result,
        questionNumber: q.questionNumber,
        originalScore: ans.score,
      });
    }

    return NextResponse.json({
      success: true,
      message: `已成功完成 ${regradeResults.length} 題之 AI 深度再閱卷！`,
      results: regradeResults,
    });
  } catch (error: any) {
    console.error('[AI Regrade API Error]:', error);
    return NextResponse.json({ error: error.message || 'AI 再閱卷異常' }, { status: 500 });
  }
}
