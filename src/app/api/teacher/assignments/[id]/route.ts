import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import {
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getTeacherClasses,
} from '@/lib/db';

async function checkTeacher(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) return null;
  return session;
}

/**
 * 檢查教師是否對此指派擁有管理權限（指派建立者本人、該班協同教師，或管理員）
 */
async function canManageAssignment(
  teacherId: string,
  role: string,
  classId: string,
  assignmentTeacherId: string
): Promise<boolean> {
  if (role === 'admin') return true;
  if (teacherId === assignmentTeacherId) return true;

  // 協同教學完全共同管理權：若為該班級的主責或協同教師，亦享有管理權
  const teacherClasses = await getTeacherClasses(teacherId, role);
  return teacherClasses.some((c) => c.id === classId);
}

/**
 * PUT: 修改指定指派任務事件（調整期限、安全碼、補考開關、關閉任務等）
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const existing = await getAssignmentById(params.id);
  if (!existing) {
    return NextResponse.json({ error: '找不到該指派任務' }, { status: 404 });
  }

  const hasPermission = await canManageAssignment(
    teacher.userId,
    teacher.role,
    existing.classId,
    existing.teacherId
  );

  if (!hasPermission) {
    return NextResponse.json(
      { error: '您不是該指派的發起教師或該班協同教師，無法修改此指派' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const updates: any = {};

    if (body.deadlineType) updates.deadlineType = body.deadlineType;
    if ('dueDate' in body) updates.dueDate = body.dueDate || null;
    if (typeof body.allowRetake === 'boolean') updates.allowRetake = body.allowRetake;
    if ('examCode' in body) updates.examCode = (body.examCode || '').trim();
    if (body.status) updates.status = body.status;
    if (body.assignmentTitle) updates.assignmentTitle = body.assignmentTitle;
    if (typeof body.allowRetakeOnExtend === 'boolean') {
      updates.allowRetakeOnExtend = body.allowRetakeOnExtend;
    }

    const updated = await updateAssignment(params.id, updates);
    if (!updated) {
      return NextResponse.json({ error: '更新失敗' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assignment: updated,
      message: '指派設定已成功更新！',
    });
  } catch (err: any) {
    console.error('[API] Update assignment error:', err);
    return NextResponse.json(
      { error: err.message || '更新指派設定失敗' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 撤回或刪除該指派任務事件
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const existing = await getAssignmentById(params.id);
  if (!existing) {
    return NextResponse.json({ error: '找不到該指派任務' }, { status: 404 });
  }

  const hasPermission = await canManageAssignment(
    teacher.userId,
    teacher.role,
    existing.classId,
    existing.teacherId
  );

  if (!hasPermission) {
    return NextResponse.json(
      { error: '您無權撤回此指派任務' },
      { status: 403 }
    );
  }

  const success = await deleteAssignment(params.id);
  return NextResponse.json({
    success,
    message: success ? '已成功撤回該指派任務' : '撤回失敗',
  });
}
