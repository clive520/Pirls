import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import {
  getTestPaperById,
  getStudentTestSubmission,
  getAssignmentById,
  getStudentSubmissions,
} from '@/lib/db';

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

  // 檢查特定指派事件 (若有提供 assignmentId)
  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get('assignmentId');
  let assignment = null;
  if (assignmentId) {
    assignment = await getAssignmentById(assignmentId);
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
    if (assignment) {
      const mySubs = await getStudentSubmissions(session.userId);
      existingSub =
        mySubs.find((s) => s.assignmentId === assignment!.id) ||
        mySubs.find(
          (s) =>
            !s.assignmentId &&
            s.testPaperId === testPaper.id &&
            s.classId === assignment!.classId
        ) ||
        null;
    } else {
      existingSub = await getStudentTestSubmission(session.userId, testPaper.id);
    }
  }

  // ⏰ 截止時間寬容防禦檢驗：
  // 寬容機制（截止前進入可完成）：截止時間過後，尚未進入測驗/尚未開始的學生完全鎖定無法進入
  if (assignment && assignment.deadlineType === 'scheduled' && assignment.dueDate) {
    const isExpired = new Date().getTime() > new Date(assignment.dueDate).getTime();
    if (isExpired && !existingSub) {
      const formattedDate = new Date(assignment.dueDate).toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      return NextResponse.json(
        {
          error: `⚠️ 本測驗任務已於 ${formattedDate} 截止，目前已關閉作答。如需補考請洽任課老師！`,
          isExpired: true,
        },
        { status: 403 }
      );
    }
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

  const allowRetake = assignment
    ? assignment.allowRetake
    : testPaper.allowRetake !== false;

  return NextResponse.json({
    testPaper: {
      ...testPaper,
      questions: studentSafeQuestions,
    },
    assignment: assignment || null,
    alreadySubmitted: Boolean(existingSub),
    allowRetake,
    submissionId: existingSub ? existingSub.id : null,
  });
}
