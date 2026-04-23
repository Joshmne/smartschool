// middleware.ts — Route-level auth guard
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Routes that DON'T require auth
const PUBLIC_PATHS = ['/', '/api/auth/login'];

// Role → allowed path prefixes
const ROLE_PATHS: Record<string, string[]> = {
  teacher: ['/teacher', '/api/students', '/api/subjects', '/api/scores', '/api/pulse', '/api/reports', '/api/messages', '/api/classes', '/api/terms', '/api/analytics'],
  md:      ['/md', '/api/fees', '/api/expenses', '/api/messages', '/api/classes', '/api/terms', '/api/analytics', '/api/students', '/api/reports'],
  bursar:  ['/md', '/api/fees', '/api/expenses', '/api/messages', '/api/classes', '/api/terms', '/api/analytics'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p)) return NextResponse.next();

  // Allow static/internal Next.js paths
  if (pathname.startsWith('/_next') || pathname.startsWith('/icons') ||
      pathname.startsWith('/manifest') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Get session token from cookie
  const token = req.cookies.get('ss_session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const user = await verifyToken(token);
  if (!user) {
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.delete('ss_session');
    return response;
  }

  // Role-based path enforcement (API routes only — pages can do their own check)
  if (pathname.startsWith('/api/')) {
    const allowed = ROLE_PATHS[user.role] ?? [];
    const isAllowed = allowed.some(prefix => pathname.startsWith(prefix)) ||
                      pathname.startsWith('/api/auth');
    if (!isAllowed) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
  }

  // Inject user info into request headers for downstream use
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id',    user.id);
  requestHeaders.set('x-user-role',  user.role);
  requestHeaders.set('x-school-id',  user.schoolId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
