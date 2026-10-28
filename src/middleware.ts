import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('pirls_token')?.value;

  // 1. 登入與註冊頁面處理：若已有登入 token，自動跳轉對應儀表板
  if (pathname === '/login' || pathname === '/register') {
    if (token) {
      const session = await verifySessionToken(token);
      if (session) {
        if (session.role === 'admin') {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url));
        }
        if (session.role === 'teacher') {
          return NextResponse.redirect(new URL('/dashboard/teacher', request.url));
        }
        if (session.role === 'student') {
          return NextResponse.redirect(new URL('/dashboard/student', request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // 2. 保護所有 /dashboard 開頭的路由 (但放行 /dashboard/student/result/:path* 供自學者查閱個人診斷書)
  if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/student/result')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const session = await verifySessionToken(token);
    if (!session) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('pirls_token');
      return response;
    }

    // 依角色攔截越權訪問
    if (pathname.startsWith('/dashboard/admin') && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/' + session.role, request.url));
    }

    if (pathname.startsWith('/dashboard/teacher') && session.role !== 'teacher' && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/' + session.role, request.url));
    }

    if (pathname.startsWith('/dashboard/student') && session.role !== 'student' && session.role !== 'teacher' && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/' + session.role, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
