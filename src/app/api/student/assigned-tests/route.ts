import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import {
  getClassAssignments,
  getTestPaperById,
  getStudentSubmissions,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'student' && session.role !== 'admin' && session.role !== 'teacher')) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const classId = session.classId;
  const studentId = session.userId;

  if (!classId) {
    return NextResponse.json({ assignedTests: [] });
  }

  // 1. 取得指派給我班級的獨立指派任務事件清單
  const classAssignments = await getClassAssignments(classId);

  // 2. 取得學生本人的歷史繳交紀錄
  const mySubmissions = await getStudentSubmissions(studentId);

  const now = new Date();
  const result: any[] = [];

  for (const asgn of classAssignments) {
    const paper = await getTestPaperById(asgn.testPaperId);
    if (!paper) continue;

    // 比對繳交紀錄：優先比對 assignmentId，次之比對 testPaperId
    const sub =
      mySubmissions.find((s) => s.assignmentId === asgn.id) ||
      mySubmissions.find(
        (s) => !s.assignmentId && s.testPaperId === asgn.testPaperId && s.classId === asgn.classId
      );

    // 判斷是否已截止
    const isExpired =
      asgn.deadlineType === 'scheduled' && asgn.dueDate
        ? now.getTime() > new Date(asgn.dueDate).getTime()
        : false;

    // 若老師在延長時勾選了開放重測，且允許重測
    const allowRetake = asgn.allowRetake;

    result.push({
      id: paper.id, // 試卷 ID
      assignmentId: asgn.id, // 獨立指派事件 ID
      title: paper.title, // 原始試卷名稱
      assignmentTitle: asgn.assignmentTitle || paper.title, // 含教師與日期的任務標籤
      teacherName: asgn.teacherName,
      targetGrade: paper.targetGrade,
      textType: paper.textType,
      themeSummary: paper.themeSummary,
      questionCount: paper.questions.length,
      totalPoints: paper.totalPoints,
      timeLimitMinutes: paper.timeLimitMinutes,
      allowRetake,
      deadlineType: asgn.deadlineType || 'unlimited',
      dueDate: asgn.dueDate || null,
      isExpired,
      isSubmitted: Boolean(sub),
      submissionId: sub ? sub.id : null,
      score: sub ? sub.totalScore : null,
      submittedAt: sub ? sub.submittedAt : null,
    });
  }

  return NextResponse.json({ assignedTests: result });
}
