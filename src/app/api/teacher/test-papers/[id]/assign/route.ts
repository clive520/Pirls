import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import { assignTestPaperToClasses, createAssignmentsForClasses } from '@/lib/db';

async function checkTeacher(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) return null;
  return session;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無存取權限' }, { status: 403 });
  }

  const body = await req.json();
  const { classIds, isPublic, examCode, allowRetake, deadlineType, dueDate } = body;

  if (!Array.isArray(classIds)) {
    return NextResponse.json({ error: '請提供班級 ID 陣列' }, { status: 400 });
  }

  const success = await assignTestPaperToClasses(params.id, classIds, {
    isPublic,
    examCode,
    allowRetake: typeof allowRetake === 'boolean' ? allowRetake : true,
  });
  if (!success) {
    return NextResponse.json({ error: '找不到試卷' }, { status: 404 });
  }

  // 同步建立獨立的 TestAssignment 事件
  const assignments = await createAssignmentsForClasses({
    testPaperId: params.id,
    classIds,
    teacherId: teacher.userId,
    teacherName: teacher.displayName || '任課教師',
    allowRetake: typeof allowRetake === 'boolean' ? allowRetake : true,
    examCode: examCode || '',
    deadlineType: deadlineType === 'scheduled' ? 'scheduled' : 'unlimited',
    dueDate: deadlineType === 'scheduled' && dueDate ? dueDate : null,
  }).catch((e) => {
    console.warn('[Assign API] createAssignmentsForClasses note:', e);
    return [];
  });

  return NextResponse.json({
    success: true,
    assignments,
    message: `已成功將試卷指派給 ${classIds.length} 個班級！`,
  });
}
