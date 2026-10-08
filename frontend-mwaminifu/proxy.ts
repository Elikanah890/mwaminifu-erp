import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/lib/server/auth';
import { verifyAccessToken } from '@/lib/server/jwt';

const ROLE_HOME: Record<string, string> = {
  SYSTEM_OWNER: '/system/dashboard',
  AGENT: '/agent/dashboard',
  BUSINESS_OWNER: '/owner/dashboard',
  EMPLOYEE: '/employee/dashboard',
};

const ROLE_PREFIX: Record<string, string> = {
  '/system': 'SYSTEM_OWNER',
  '/agent': 'AGENT',
  '/owner': 'BUSINESS_OWNER',
  '/employee': 'EMPLOYEE',
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  // Role is derived ONLY from the signed httpOnly JWT — never from a
  // client-readable cookie. The backend remains the security boundary.
  const claims = await verifyAccessToken(token);
  const role = claims?.role ?? '';

  const isAuthPage = pathname === '/login';
  const prefix = ['/system', '/agent', '/owner', '/employee'].find(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // Any portal route requires an authenticated session.
  if (prefix && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Role-based access control: a user must not land in another role's portal.
  // (The backend still enforces this on every request.)
  if (prefix && role) {
    const requiredRole = ROLE_PREFIX[prefix];
    if (role !== requiredRole) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/login', request.url));
    }
  }

  // Authenticated users hitting the login page are sent to their portal.
  if (isAuthPage && token && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/system/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|.*\\.(?:svg|png|jpe?g|gif|webp|ico|woff2?|css|js|map|json|xml|txt|md|avif)$).*)',
  ],
};
