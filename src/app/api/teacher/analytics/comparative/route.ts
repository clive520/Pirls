import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import {
  ensureLocalDB,
  syncCloudOnBoot,
  getTeacherClasses,
  getClassStudents,
  getTestPaperSubmissions,
} from '@/lib/db';
import { computeComparativeAnalysis } from '@/lib/analytics/comparative';

export const dynamic = 'force-dynamic';

async function checkTeacher(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) return null;
  return session;
}

export async function GET(req: NextRequest) {
  try {
    const teacher = await checkTeacher(req);
    if (!teacher) {
      return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
    }

    await syncCloudOnBoot();
    const state = ensureLocalDB();

    const { searchParams } = new URL(req.url);
    let classId = searchParams.get('classId');
    const preTestId = searchParams.get('preTestId');
    const postTestId = searchParams.get('postTestId');
    const studentId = searchParams.get('studentId') || undefined;

    // 取得該教師管理的所有班級
    const teacherClasses = await getTeacherClasses(teacher.userId, teacher.role);
    if (teacherClasses.length === 0) {
      return NextResponse.json({
        classes: [],
        availableTestPapers: [],
        comparativeData: null,
      });
    }

    // 若未指定 classId，預設選取第一個班級
    if (!classId || !teacherClasses.some((c) => c.id === classId)) {
      classId = teacherClasses[0].id;
    }

    const currentClass = teacherClasses.find((c) => c.id === classId)!;
    const classStudents = await getClassStudents(classId);
    const studentIds = new Set(classStudents.map((s) => s.id));

    // 掃描本班學生有作答過的所有試卷
    const paperSubmissionCountMap = new Map<string, number>();
    Object.values(state.submissions || {}).forEach((sub) => {
      if (studentIds.has(sub.studentId)) {
        const count = paperSubmissionCountMap.get(sub.testPaperId) || 0;
        paperSubmissionCountMap.set(sub.testPaperId, count + 1);
      }
    });

    const availableTestPapers = Array.from(paperSubmissionCountMap.entries())
      .map(([paperId, count]) => {
        const paper = state.testPapers[paperId];
        return {
          id: paperId,
          title: paper ? paper.title : '未知試卷',
          textType: paper?.textType || 'informational',
          targetGrade: paper?.targetGrade || 4,
          submittedCount: count,
          createdAt: paper?.createdAt || '',
        };
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 決定前後測試卷 ID（若前端未指定且試卷數 >= 2，自動給予最早的一份與最新的一份）
    let activePreId = preTestId;
    let activePostId = postTestId;

    if (!activePreId && availableTestPapers.length >= 2) {
      activePreId = availableTestPapers[0].id;
    }
    if (!activePostId && availableTestPapers.length >= 2) {
      activePostId = availableTestPapers[availableTestPapers.length - 1].id;
    }

    let comparativeData = null;
    if (activePreId && activePostId) {
      comparativeData = await computeComparativeAnalysis({
        classId,
        preTestId: activePreId,
        postTestId: activePostId,
        studentId,
      });
    }

    return NextResponse.json({
      success: true,
      classes: teacherClasses,
      selectedClassId: classId,
      students: classStudents.map((s) => ({
        id: s.id,
        name: s.displayName,
        seatNumber: s.seatNumber,
      })),
      availableTestPapers,
      selectedPreTestId: activePreId || null,
      selectedPostTestId: activePostId || null,
      comparativeData,
    });
  } catch (err: any) {
    console.error('Comparative analytics error:', err);
    return NextResponse.json(
      { error: err.message || '無法計算前後測對照數據' },
      { status: 500 }
    );
  }
}
