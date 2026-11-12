import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getStudentSubmissions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'student' && session.role !== 'admin' && session.role !== 'teacher')) {
      return NextResponse.json({ error: '無存取權限' }, { status: 403 });
    }

    const studentId = session.userId;
    const allMySubs = await getStudentSubmissions(studentId);

    // 篩選屬於自主練習的紀錄 (isPractice 為 true 或未關聯班級 assignmentId)
    const practiceSubs = allMySubs.filter((s) => s.isPractice === true || !s.assignmentId);

    const result = practiceSubs.map((s) => ({
      id: s.id,
      testPaperId: s.testPaperId,
      testPaperTitle: s.testPaperTitle,
      targetGrade: s.targetGrade,
      textType: s.textType,
      totalScore: s.totalScore,
      maxScore: s.maxScore,
      percentage: s.percentage,
      scaleScore: s.scaleScore,
      benchmarkKey: s.benchmarkKey,
      benchmarkName: s.benchmarkName,
      normPR: s.normPR,
      durationSeconds: s.durationSeconds,
      submittedAt: s.submittedAt,
      reviewStatus: s.reviewStatus || (s.isTeacherReviewed ? 'teacher_reviewed' : s.aiReviewedAt ? 'ai_reviewed' : 'unreviewed'),
      isTeacherReviewed: !!s.isTeacherReviewed,
      teacherGeneralNote: s.teacherGeneralNote || null,
      hasAiAdvice: !!s.aiPedagogicalAdvice,
    }));

    return NextResponse.json({
      success: true,
      practiceSubmissions: result,
      totalCount: result.length,
    });
  } catch (err: any) {
    console.error('[API Student Practice History Error]:', err);
    return NextResponse.json({ error: err.message || '載入自學歷程失敗' }, { status: 500 });
  }
}
