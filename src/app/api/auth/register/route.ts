import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, createUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, displayName, school } = body;

    if (!username || !password || !displayName) {
      return NextResponse.json({ error: '請完整填寫所有必填欄位' }, { status: 400 });
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: '此使用者帳號已被註冊，請更換其他帳號' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await createUser({
      username: username.trim(),
      passwordHash,
      displayName: displayName.trim(),
      role: 'teacher',
      status: 'pending', // 註冊後為待審核狀態，需經由系統管理員審核開通後方可正式登入
      school: school?.trim() || '未填寫',
    });

    return NextResponse.json({
      success: true,
      message: '教師註冊申請已成功送出！請等待系統管理員審核核准後，方可登入建立班級與管理評量。',
      userId: newUser.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '註冊失敗' }, { status: 500 });
  }
}
