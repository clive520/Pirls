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
