import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { createStudentsBatch, getClassStudents, getUserByUsername } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkTeacher(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');

  if (!classId) {
    return NextResponse.json({ error: '請指定班級 ID' }, { status: 400 });
  }

  const students = await getClassStudents(classId);
  return NextResponse.json({
    students: students.map(({ passwordHash, ...rest }) => rest),
  });
}

export async function POST(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const body = await req.json();

  // 支援全班密碼一鍵重設為 6 碼隨機數字
  if (body.action === 'reset_all_passwords') {
    if (!body.classId) {
      return NextResponse.json({ error: '請指定班級 ID' }, { status: 400 });
    }
    const { batchResetClassPasswords } = await import('@/lib/db');
    const result = await batchResetClassPasswords(body.classId);
    return NextResponse.json({
      success: true,
      message: `已成功為全班 ${result.count} 位學生重新產生 6 碼亂數密碼！`,
    });
  }

  const { classId, gradeLevel, students } = body;

  if (!classId || !Array.isArray(students) || students.length === 0) {
    return NextResponse.json({ error: '請提供班級與學生資料清單' }, { status: 400 });
  }

  // 驗證帳號格式或重複
  const validBatch: Array<{
    username: string;
    plainPassword: string;
    displayName: string;
    seatNumber: number;
    gradeLevel: number;
  }> = [];

  for (const s of students) {
    const username = s.username.trim();
    const existing = await getUserByUsername(username);
    if (existing) {
      return NextResponse.json(
        { error: `帳號 [${username}] 已存在，請確認座號或更換帳號` },
        { status: 400 }
      );
    }

    // 學生初始密碼：預設為 6 碼亂數數字密碼
    const initialPassword = s.plainPassword?.trim() || Math.floor(100000 + Math.random() * 900000).toString();

    validBatch.push({
      username,
      plainPassword: initialPassword,
      displayName: s.displayName?.trim() || `學生 ${s.seatNumber} 號`,
      seatNumber: s.seatNumber,
      gradeLevel: gradeLevel || 4,
    });
  }

  const created = await createStudentsBatch(teacher.userId, classId, validBatch);

  return NextResponse.json({
    success: true,
    message: `已成功建立 ${created.length} 位學生帳號！`,
    students: validBatch.map((s, idx) => ({
      id: created[idx].id,
      username: s.username,
      displayName: s.displayName,
      seatNumber: s.seatNumber,
      initialPassword: s.plainPassword, // 回傳初使密碼方便老師列印帳密單
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ error: '請指定欲刪除的學生 ID' }, { status: 400 });
  }

  const { deleteStudent } = await import('@/lib/db');
  const success = await deleteStudent(studentId);

  if (!success) {
    return NextResponse.json({ error: '找不到該學生或刪除失敗' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: '學生帳號已成功刪除' });
}

export async function PUT(req: NextRequest) {
  const teacher = await checkTeacher(req);
  if (!teacher) {
    return NextResponse.json({ error: '無教師存取權限' }, { status: 403 });
  }

  const body = await req.json();
  const { studentId, displayName, seatNumber, username, newPassword } = body;

  if (!studentId) {
    return NextResponse.json({ error: '請指定學生 ID' }, { status: 400 });
  }

  const { updateStudentInfo } = await import('@/lib/db');
  const res = await updateStudentInfo(studentId, {
    displayName,
    seatNumber,
    username,
    plainPassword: newPassword,
  });

  if (!res.success) {
    return NextResponse.json({ error: res.error || '更新學生資料失敗' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: `學生【${res.student?.displayName}】的帳號資料與密碼已成功更新！`,
    student: res.student,
  });
}
