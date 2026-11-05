import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';
import {
  getClassCoTeachers,
  addCoTeacherToClass,
  removeCoTeacherFromClass,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkTeacher(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) return null;
  return session;
}

// GET: 取得班級之共同管理成員 (主責教師、協同教師清單、全校其他可邀請教師)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const classId = params.id;
  const data = await getClassCoTeachers(classId, teacher.userId, teacher.role);

  if (!data) {
    return NextResponse.json({ error: '找不到該班級或您無權存取' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data,
  });
}

// POST: 邀請 / 新增協同管理教師
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const classId = params.id;
  const body = await req.json();
  const { teacherId } = body;

  if (!teacherId || typeof teacherId !== 'string') {
    return NextResponse.json({ error: '請提供欲邀請之教師 ID' }, { status: 400 });
  }

  const result = await addCoTeacherToClass(classId, teacherId, teacher.userId, teacher.role);
  if (!result.success) {
    return NextResponse.json({ error: result.error || '邀請協同教師失敗' }, { status: 400 });
  }

  // 重新取得最新協同成員資料
  const updatedData = await getClassCoTeachers(classId, teacher.userId, teacher.role);

  return NextResponse.json({
    success: true,
    message: '已成功邀請該教師加入共同管理！',
    class: result.class,
    data: updatedData,
  });
}

// DELETE: 移除協同教師 / 協同教師本人主動退出共同管理
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const classId = params.id;
  const { searchParams } = new URL(req.url);
  const targetTeacherId = searchParams.get('teacherId');

  if (!targetTeacherId) {
    return NextResponse.json({ error: '請指定欲移除之協同教師 ID' }, { status: 400 });
  }

  const result = await removeCoTeacherFromClass(classId, targetTeacherId, teacher.userId, teacher.role);
  if (!result.success) {
    return NextResponse.json({ error: result.error || '移除協同教師失敗' }, { status: 400 });
  }

  const updatedData = await getClassCoTeachers(classId, teacher.userId, teacher.role);

  return NextResponse.json({
    success: true,
    message: teacher.userId === targetTeacherId ? '您已成功退出該班級的共同管理' : '已成功移除該協同教師',
    class: result.class,
    data: updatedData,
  });
}
