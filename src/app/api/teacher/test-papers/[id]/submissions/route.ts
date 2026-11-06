import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTestPaperById, getTestPaperSubmissions, getAssignmentById } from '@/lib/db';
import { calculateBenchmarkDistribution, calculatePIRLSScaleScore } from '@/lib/pirls-norm';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const testPaper = await getTestPaperById(params.id);
  if (!testPaper) {
    return NextResponse.json({ error: '找不到該試卷' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get('assignmentId');

  let assignment = null;
  if (assignmentId) {
    assignment = await getAssignmentById(assignmentId);
  }

  let submissions = await getTestPaperSubmissions(params.id);

  if (assignment) {
    // 優先篩選出此指派事件的繳卷；兼顧遷移前的舊資料
    submissions = submissions.filter(
      (s) =>
        s.assignmentId === assignment!.id ||
        (!s.assignmentId && s.classId === assignment!.classId)
    );
  }

  const totalSubmitted = submissions.length;
  const avgScore =
    totalSubmitted > 0
      ? Math.round(
          (submissions.reduce((acc, s) => acc + s.totalScore, 0) / totalSubmitted) * 10
        ) / 10
      : 0;

  const benchmarkDistribution = calculateBenchmarkDistribution(submissions);

  return NextResponse.json({
    testPaper: {
      id: testPaper.id,
      title: testPaper.title,
      totalPoints: testPaper.totalPoints,
      targetGrade: testPaper.targetGrade,
      textType: testPaper.textType,
    },
    assignment: assignment
      ? {
          id: assignment.id,
          assignmentTitle: assignment.assignmentTitle,
          className: assignment.className,
          teacherName: assignment.teacherName,
          dueDate: assignment.dueDate,
          deadlineType: assignment.deadlineType,
        }
      : null,
    stats: {
      totalSubmitted,
      avgScore,
      maxScore: testPaper.totalPoints,
      avgScaleScore: benchmarkDistribution.avgScaleScore,
    },
    benchmarkDistribution,
    submissions: submissions.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      studentName: s.studentName,
      className: s.className,
      seatNumber: s.seatNumber,
      totalScore: s.totalScore,
      maxScore: s.maxScore,
      percentage: s.percentage,
      scaleScore: s.scaleScore ?? calculatePIRLSScaleScore(s.totalScore, s.maxScore),
      benchmarkKey: s.benchmarkKey,
      benchmarkName: s.benchmarkName,
      classPR: s.classPR,
      normPR: s.normPR,
      processScores: s.processScores,
      isTeacherReviewed: Boolean(s.isTeacherReviewed),
      teacherGeneralNote: s.teacherGeneralNote,
      submittedAt: s.submittedAt,
    })),
  });
}
