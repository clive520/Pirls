import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { listPendingTeachers, listApprovedTeachers, updateUserStatus } from '@/lib/db';

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get('pirls_token')?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function GET(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: '無管理員權限' }, { status: 403 });
  }

  const pending = await listPendingTeachers();
  const approved = await listApprovedTeachers();

  return NextResponse.json({
    pendingTeachers: pending.map(({ passwordHash, ...rest }) => rest),
    approvedTeachers: approved.map(({ passwordHash, ...rest }) => rest),
  });
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: '無管理員權限' }, { status: 403 });
  }

  const body = await req.json();
  const { teacherId, action } = body;

  if (!teacherId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: '無效的操作指令' }, { status: 400 });
  }

  const newStatus = action === 'approve' ? 'active' : 'suspended';
  const success = await updateUserStatus(teacherId, newStatus);

  if (!success) {
    return NextResponse.json({ error: '找不到該教師' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: action === 'approve' ? '已核准教師帳號！' : '已駁回/停用教師帳號',
  });
}

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

  const { getUserByUsername, createUser } = await import('@/lib/db');
  const { hashPassword } = await import('@/lib/auth');

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
