import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from '@/lib/server/auth';
import { setCsrfCookie } from '@/lib/server/session';
import { deriveCsrfToken } from '@/lib/server/csrf';

export const dynamic = 'force-dynamic';

/**
 * Returns the CSRF token bound to the current session and refreshes the
 * double-submit cookie. The SPA calls this on load and whenever a write is
 * rejected with CSRF_FAILED, so a missing or stale cookie self-heals instead of
 * blocking sales.
 */
export async function GET() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }, timestamp: new Date().toISOString() },
      { status: 401 }
    );
  }

  const csrf = deriveCsrfToken(token);
  await setCsrfCookie(csrf);

  return NextResponse.json({
    success: true,
    data: { token: csrf },
    message: 'CSRF token issued',
    timestamp: new Date().toISOString(),
  });
}
