import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTestPaperById, getStudentTestSubmission } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const testPaper = await getTestPaperById(params.id);
  if (!testPaper) {
    return NextResponse.json({ error: '找不到該試卷' }, { status: 404 });
  }

  const token = req.cookies.get('pirls_token')?.value;
  let session = null;
  if (token) {
    session = await verifySessionToken(token);
  }

  // 若非公開試卷 (isPublic !== true)，必須是已登入的學生或教師
  if (!testPaper.isPublic) {
    if (!token) {
      return NextResponse.json({ error: '此為班級專用測驗，請先登入學生帳號！' }, { status: 401 });
    }
    if (!session) {
      return NextResponse.json({ error: '無存取權限' }, { status: 403 });
    }
  }

  // 檢查是否已作答過 (若有登入 session)
  let existingSub = null;
  if (session) {
    existingSub = await getStudentTestSubmission(session.userId, testPaper.id);
  }

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
