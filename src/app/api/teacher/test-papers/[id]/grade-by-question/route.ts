import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import {
  getTestPaperById,
  getTestPaperSubmissions,
  getAssignmentById,
  batchUpdateSubmissionReviews,
} from '@/lib/db';

export async function GET(
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
      submissions = submissions.filter(
        (s) =>
          s.assignmentId === assignment!.id ||
          (!s.assignmentId && s.classId === assignment!.classId)
      );
    }

    // 依班級、座號 (1, 2, 3...)、姓名排序，確保從 1 號一路批改至最後一號
    submissions.sort((a, b) => {
      const classCompare = (a.className || '').localeCompare(b.className || '', 'zh-Hant');
      if (classCompare !== 0) return classCompare;
      const seatA = a.seatNumber ?? 9999;
      const seatB = b.seatNumber ?? 9999;
      if (seatA !== seatB) return seatA - seatB;
      return a.studentName.localeCompare(b.studentName, 'zh-Hant');
    });

    return NextResponse.json({
      testPaper: {
        id: testPaper.id,
        title: testPaper.title,
        targetGrade: testPaper.targetGrade,
        textType: testPaper.textType,
        totalPoints: testPaper.totalPoints,
        wordCount: testPaper.wordCount,
        themeSummary: testPaper.themeSummary,
        paragraphs: testPaper.paragraphs,
        articleContent: testPaper.articleContent,
        illustrations: testPaper.illustrations,
      },
      assignment: assignment
        ? {
            id: assignment.id,
            assignmentTitle: assignment.assignmentTitle,
            className: assignment.className,
            teacherName: assignment.teacherName,
          }
        : null,
      questions: testPaper.questions || [],
      submissions: submissions.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        studentName: s.studentName,
        seatNumber: s.seatNumber,
        className: s.className,
        totalScore: s.totalScore,
        maxScore: s.maxScore,
        scaleScore: s.scaleScore,
        classPR: s.classPR,
        normPR: s.normPR,
        isTeacherReviewed: Boolean(s.isTeacherReviewed),
        submittedAt: s.submittedAt,
        answers: s.answers.map((a) => ({
          questionId: a.questionId,
          questionNumber: a.questionNumber,
          type: a.type,
          score: a.score,
          maxScore: a.points,
          teacherScore: a.teacherScore,
          originalScore: a.originalScore,
          studentAnswer: a.studentAnswer,
          aiFeedback: a.aiFeedback,
          teacherComment: a.teacherComment,
          isTeacherReviewed: a.isTeacherReviewed,
          code: a.code,
        })),
      })),
    });
  } catch (error: any) {
    console.error('[Grade by Question GET Error]:', error);
    return NextResponse.json({ error: error.message || '讀取資料失敗' }, { status: 500 });
  }
}

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

    const body = await req.json();
    const { questionId, updates } = body;

    if (!questionId || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: '缺少評分資料' }, { status: 400 });
    }

    const reviewerName = session.displayName || '授課教師';

    // 採用單次高效率批次持久化，避免逐生觸發 Blob / Firestore 同步造成的嚴重延遲
    const result = await batchUpdateSubmissionReviews(reviewerName, questionId, updates);

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      message: `本題全班成績 (${result.updatedCount} 位學生) 核定儲存完成！已同步更新 PIRLS 量尺分與同儕 PR。`,
    });
  } catch (error: any) {
    console.error('[Grade by Question POST Error]:', error);
    return NextResponse.json({ error: error.message || '儲存評分失敗' }, { status: 500 });
  }
}
