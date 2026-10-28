import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTestPaperById, getStudentTestSubmission } from '@/lib/db';

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

  const testPaper = await getTestPaperById(params.id);
  if (!testPaper) {
    return NextResponse.json({ error: '找不到該試卷' }, { status: 404 });
  }

  // 檢查是否已作答過
  const existingSub = await getStudentTestSubmission(session.userId, testPaper.id);

  // 防作弊脫敏過濾：去除正確答案標記與評卷規準
  const studentSafeQuestions = testPaper.questions.map((q) => {
    const { rubric, correctAnswerLabel, ...safeQ } = q;
    let safeOptions = safeQ.options;
    if (safeOptions) {
      safeOptions = safeOptions.map(({ isCorrect, explanation, ...opt }) => opt as any);
    }
    return {
      ...safeQ,
      options: safeOptions,
    };
  });

  return NextResponse.json({
    testPaper: {
      ...testPaper,
      questions: studentSafeQuestions,
    },
    alreadySubmitted: Boolean(existingSub),
    submissionId: existingSub ? existingSub.id : null,
  });
}
