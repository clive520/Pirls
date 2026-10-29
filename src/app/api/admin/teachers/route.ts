import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import {
  getUserById,
  getUserByUsername,
  createUser,
  getTeachersWithStats,
  updateUserStatus,
  updateUserRole,
  deleteTeacher,
  resetUserPassword,
} from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * 嚴格檢查請求者是否具備有效的系統管理員權限
 * 必須具備 session 且在資料庫中身分為 role === 'admin' 且 status === 'active'
 */
async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await getUserById(session.userId);
  if (!user || user.role !== 'admin' || user.status !== 'active') {
    return null;
  }
  return user;
}

/**
 * GET: 獲取管理員後台所需之所有數據（管理員清單、待審核清單、已核准教師清單、統計數據及轉移目標）
 */
export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: '無管理員權限' }, { status: 403 });
  }

  const data = await getTeachersWithStats();
  return NextResponse.json(data);
}

/**
 * POST: 審核操作與身分角色變更
 * 支援操作：
 * - 'approve': 核准教師開通
 * - 'reject': 駁回/停用教師
 * - 'reset_to_pending': 將教師打回未審核/待審核狀態
 * - 'make_admin': 指定教師為系統管理員
 * - 'revoke_admin': 解除系統管理員身分，恢復為一般教師
 */
export async function POST(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: '無管理員權限' }, { status: 403 });
  }

  const body = await req.json();
  const { teacherId, action } = body;

  const validActions = [
    'approve',
    'reject',
    'reset_to_pending',
    'make_admin',
    'revoke_admin',
    'reset_password',
  ];
  if (!teacherId || !validActions.includes(action)) {
    return NextResponse.json({ error: '無效的操作指令' }, { status: 400 });
  }

  if (action === 'approve') {
    const success = await updateUserStatus(teacherId, 'active');
    if (!success) return NextResponse.json({ error: '找不到該教師' }, { status: 404 });
    return NextResponse.json({ success: true, message: '已成功核准教師帳號，該教師現在可正式登入使用！' });
  }

  if (action === 'reject') {
    const success = await updateUserStatus(teacherId, 'suspended');
    if (!success) {
      return NextResponse.json(
        { error: '找不到該教師，或無法停用系統唯一的活躍管理員' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, message: '已停用該教師帳號' });
  }

  if (action === 'reset_to_pending') {
    // 把老師的帳號打回未審核狀態
    const success = await updateUserStatus(teacherId, 'pending');
    if (!success) {
      return NextResponse.json(
        { error: '找不到該教師，或無法將系統唯一的管理員打回未審核狀態' },
        { status: 400 }
      );
    }
    return NextResponse.json({
      success: true,
      message: '已將該教師帳號打回未審核狀態，該帳號將無法登入直到管理員再次核准！',
    });
  }

  if (action === 'make_admin') {
    // 指定老師為系統管理員
    const res = await updateUserRole(teacherId, 'admin');
    if (!res.success) {
      return NextResponse.json({ error: res.error || '指定管理員失敗' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: '已成功指定該教師為系統管理員！' });
  }

  if (action === 'revoke_admin') {
    // 解除管理員身分，恢復為一般教師
    const res = await updateUserRole(teacherId, 'teacher');
    if (!res.success) {
      return NextResponse.json({ error: res.error || '解除管理員身分失敗' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: '已解除該員之管理員權限，恢復為一般教師。' });
  }

  if (action === 'reset_password') {
    // 方案 1：管理員直接重設教師密碼
    const { newPassword } = body;
    const finalPassword =
      newPassword && typeof newPassword === 'string' && newPassword.trim().length >= 4
        ? newPassword.trim()
        : 'teacher123';

    const teacher = await getUserById(teacherId);
    if (!teacher) {
      return NextResponse.json({ error: '找不到該教師帳號' }, { status: 404 });
    }

    const success = await resetUserPassword(teacherId, finalPassword);
    if (!success) {
      return NextResponse.json({ error: '重設密碼失敗，請稍後重試' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `已成功為【${teacher.displayName}】重設密碼！`,
      username: teacher.username,
      displayName: teacher.displayName,
      newPassword: finalPassword,
    });
  }
}

/**
 * DELETE: 刪除教師帳號，並處理名下班級、學生與測驗作答記錄
 * 支援處置模式：
 * 1. deleteMode: 'transfer', targetTeacherId: '...' -> 轉移給指定教師接手
 * 2. deleteMode: 'cascade' -> 連帶徹底刪除名下班級、學生與測驗紀錄
 */
export async function DELETE(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: '無管理員權限' }, { status: 403 });
  }

  const body = await req.json();
  const { teacherId, deleteMode, targetTeacherId } = body;

  if (!teacherId) {
    return NextResponse.json({ error: '缺少教師 ID' }, { status: 400 });
  }

  if (!['transfer', 'cascade'].includes(deleteMode)) {
    return NextResponse.json(
      { error: '請指定刪除處置模式（指定接手 transfer 或連帶刪除 cascade）' },
      { status: 400 }
    );
  }

  const res = await deleteTeacher(teacherId, {
    deleteMode,
    targetTeacherId,
  });

  if (!res.success) {
    return NextResponse.json({ error: res.error || '刪除失敗' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: res.message,
  });
}

/**
 * PUT: 管理員直接建立已開通教師帳號
 */
export async function PUT(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: '無管理員權限' }, { status: 403 });
  }

  const body = await req.json();
  const { username, password, displayName, school } = body;

  if (!username || !password || !displayName) {
    return NextResponse.json({ error: '請填寫完整教師帳號、密碼與姓名' }, { status: 400 });
  }

  const existing = await getUserByUsername(username.trim());
  if (existing) {
    return NextResponse.json({ error: '此帳號已存在，請更換帳號' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const newTeacher = await createUser({
    username: username.trim(),
    passwordHash,
    displayName: displayName.trim(),
    role: 'teacher',
    status: 'active',
    school: school?.trim() || '未填寫',
  });

  return NextResponse.json({
    success: true,
    message: `已成功直接建立教師帳號：${newTeacher.displayName}`,
    teacher: {
      id: newTeacher.id,
      username: newTeacher.username,
      displayName: newTeacher.displayName,
      school: newTeacher.school,
      status: newTeacher.status,
    },
  });
}
