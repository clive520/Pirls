import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, seedInitialAdmin } from '@/lib/db';
import { verifyPassword, signSessionToken } from '@/lib/auth';
import { AuthSession } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    // 確保初始管理員已就緒
    await seedInitialAdmin();

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: '請輸入帳號與密碼' }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
    }

    // 檢查帳號審核狀態
    if (user.status === 'pending') {
      return NextResponse.json(
        { error: '您的教師帳號尚在審核中，經由管理員核准後方可正式登入使用！' },
        { status: 403 }
      );
    }

    if (user.status === 'suspended') {
      return NextResponse.json({ error: '此帳號已被停用，請聯繫系統管理員' }, { status: 403 });
    }

    const session: AuthSession = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      classId: user.classId,
      className: user.className,
      gradeLevel: user.gradeLevel,
    };

    const token = await signSessionToken(session);

    const res = NextResponse.json({
      success: true,
      user: session,
    });

    res.cookies.set('pirls_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 天
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '伺服器發生錯誤' }, { status: 500 });
  }
}
