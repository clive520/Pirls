import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import {
  getTeacherAssignments,
  createAssignmentsForClasses,
  getAssignmentsProgressStats,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkTeacher(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) return null;
  return session;
}

/**
 * GET: 取得當前教師負責與協同班級的所有獨立指派任務事件與進度統計
 */
export async function GET(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const isAdmin = teacher.role === 'admin';
  const assignments = await getTeacherAssignments(teacher.userId, isAdmin);
  const assignmentIds = assignments.map((a) => a.id);
  const stats = await getAssignmentsProgressStats(assignmentIds);

  return NextResponse.json({
    success: true,
    assignments,
    stats,
    currentUserId: teacher.userId,
    isAdmin,
  });
}

/**
 * POST: 建立獨立指派任務事件（為各勾選班級分別建立獨立實例，班級間互不干擾）
 */
export async function POST(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { testPaperId, classIds, allowRetake, examCode, deadlineType, dueDate } = body;

    if (!testPaperId || !Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json(
        { error: '請提供有效的試卷 ID 與至少一個目標班級' },
        { status: 400 }
      );
    }

    const createdAssignments = await createAssignmentsForClasses({
      testPaperId,
      classIds,
      teacherId: teacher.userId,
      teacherName: teacher.displayName || '任課教師',
      allowRetake: allowRetake !== false,
      examCode: (examCode || '').trim(),
      deadlineType: deadlineType === 'scheduled' ? 'scheduled' : 'unlimited',
      dueDate: deadlineType === 'scheduled' && dueDate ? dueDate : null,
    });

    return NextResponse.json({
      success: true,
      assignments: createdAssignments,
      message: `已成功為 ${createdAssignments.length} 個班級分別建立獨立指派任務！`,
    });
  } catch (err: any) {
    console.error('[API] Create assignments failed:', err);
    return NextResponse.json(
      { error: err.message || '建立指派任務失敗' },
      { status: 500 }
    );
  }
}
