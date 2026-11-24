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

function canonicalHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://mwaminifu.co.tz').host.toLowerCase();
  } catch {
    return 'mwaminifu.co.tz';
  }
}

/** This app is production-hosted on the VPS only. PaaS deployments redirect. */
function isPaaSDeploymentHost(host: string): boolean {
  return host.endsWith('.vercel.app') || host.endsWith('.onrender.com');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = (forwardedHost?.split(',')[0] ?? request.headers.get('host') ?? '')
    .trim()
    .toLowerCase();
  if (isPaaSDeploymentHost(host)) {
    const target = new URL(pathname + request.nextUrl.search, `https://${canonicalHost()}`);
    return NextResponse.redirect(target, 308);
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  // Role is derived ONLY from the signed httpOnly JWT — never from a
  // client-readable cookie. The backend remains the security boundary.
  const claims = await verifyAccessToken(token);
  const role = claims?.role ?? '';
  const mustChangePassword = claims?.mustChangePassword === true;

  const isAuthPage = pathname === '/login';

  // A restricted token may only reach the password-change screen.
  if (mustChangePassword && pathname !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', request.url));
  }
  if (pathname === '/change-password' && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

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
  if (isAuthPage && token && mustChangePassword) {
    return NextResponse.redirect(new URL('/change-password', request.url));
  }
  if (isAuthPage && token && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/system/dashboard', request.url));
  }

  const response = NextResponse.next();
  const isPrivatePage =
    Boolean(prefix) || pathname === '/change-password' || pathname === '/reset-password';
  if (isPrivatePage) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|.*\\.(?:svg|png|jpe?g|gif|webp|ico|woff2?|css|js|map|json|xml|txt|md|avif)$).*)',
  ],
};
