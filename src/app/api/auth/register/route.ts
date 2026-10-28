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
      status: 'active', // 註冊即直接開通，讓教師可即刻登入建立班級與學生
      school: school?.trim() || '未填寫',
    });

    return NextResponse.json({
      success: true,
      message: '教師帳號已成功建立！您現在可以立即登入系統，建立班級與學生帳號。',
      userId: newUser.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '註冊失敗' }, { status: 500 });
  }
}
