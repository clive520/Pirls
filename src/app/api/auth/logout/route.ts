import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true, message: '已成功登出' });
  res.cookies.set('pirls_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return res;
}
