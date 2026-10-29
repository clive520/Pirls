import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getAssignedTestPapersForClass, getStudentSubmissions } from '@/lib/db';

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

  let assignedTests: any[] = [];
  if (classId) {
    assignedTests = await getAssignedTestPapersForClass(classId);
  }

  // 取得學生歷史繳交紀錄，比對是否已作答
  const mySubmissions = await getStudentSubmissions(studentId);
  const subMap = new Map(mySubmissions.map((s) => [s.testPaperId, s]));

  const result = assignedTests.map((t) => {
    const sub = subMap.get(t.id);
    return {
      id: t.id,
      title: t.title,
      targetGrade: t.targetGrade,
      textType: t.textType,
      themeSummary: t.themeSummary,
      questionCount: t.questions.length,
      totalPoints: t.totalPoints,
      timeLimitMinutes: t.timeLimitMinutes,
      isSubmitted: Boolean(sub),
      submissionId: sub ? sub.id : null,
      score: sub ? sub.totalScore : null,
      submittedAt: sub ? sub.submittedAt : null,
    };
  });

  return NextResponse.json({ assignedTests: result });
}
