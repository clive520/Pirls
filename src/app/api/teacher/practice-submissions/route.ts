import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { getTeacherClasses } from '@/lib/db/classes';
import { ensureLocalDB, syncCloudOnBoot } from '@/lib/db/core';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('pirls_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
    }

    const isAdmin = session.role === 'admin';
    const teacherClasses = await getTeacherClasses(session.userId, session.role);
    const accessibleClassIds = new Set(teacherClasses.map((c) => c.id));

    await syncCloudOnBoot();
    const state = ensureLocalDB();
    const allSubs = Object.values(state.submissions || {});

    // 取得查詢參數
    const { searchParams } = new URL(req.url);
    const filterClassId = searchParams.get('classId');
    const filterStatus = searchParams.get('status');
    const searchQuery = (searchParams.get('q') || '').toLowerCase().trim();

    // 篩選自主練習 (isPractice === true 或未綁定 assignmentId)
    let practiceSubs = allSubs.filter((s) => {
      const isPractice = s.isPractice === true || !s.assignmentId;
      if (!isPractice) return false;

      // 檢查教師權限：管理員可檢視全部；教師可檢視其班級學生（或包含開放體驗區如果該生屬於其班級）
      if (!isAdmin && !accessibleClassIds.has(s.classId)) {
        return false;
      }

      // 班級過濾
      if (filterClassId && filterClassId !== 'all' && s.classId !== filterClassId) {
        return false;
      }

      // 複閱狀態過濾
      const curStatus = s.reviewStatus || (s.isTeacherReviewed ? 'teacher_reviewed' : s.aiReviewedAt ? 'ai_reviewed' : 'unreviewed');
      if (filterStatus && filterStatus !== 'all' && curStatus !== filterStatus) {
        return false;
      }

      // 關鍵字搜尋 (學生姓名、座號、試卷名稱)
      if (searchQuery) {
        const matchName = (s.studentName || '').toLowerCase().includes(searchQuery);
        const matchSeat = String(s.seatNumber || '').includes(searchQuery);
        const matchTitle = (s.testPaperTitle || '').toLowerCase().includes(searchQuery);
        const matchClass = (s.className || '').toLowerCase().includes(searchQuery);
        if (!matchName && !matchSeat && !matchTitle && !matchClass) {
          return false;
        }
      }

      return true;
    });

    // 依繳交時間由新到舊排序
    practiceSubs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const result = practiceSubs.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      studentName: s.studentName,
      seatNumber: s.seatNumber,
      classId: s.classId,
      className: s.className,
      testPaperId: s.testPaperId,
      testPaperTitle: s.testPaperTitle,
      targetGrade: s.targetGrade,
      textType: s.textType,
      totalScore: s.totalScore,
      maxScore: s.maxScore,
      percentage: s.percentage,
      scaleScore: s.scaleScore ?? 500,
      benchmarkKey: s.benchmarkKey || 'intermediate',
      benchmarkName: s.benchmarkName || '中基準',
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
      submissions: result,
      totalCount: result.length,
      classes: teacherClasses.map((c) => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel })),
    });
  } catch (err: any) {
    console.error('[API Teacher Practice Submissions Error]:', err);
    return NextResponse.json({ error: err.message || '載入自主練習清單失敗' }, { status: 500 });
  }
}
