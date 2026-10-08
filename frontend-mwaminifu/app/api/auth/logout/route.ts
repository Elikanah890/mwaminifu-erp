import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_API_URL, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/server/auth';
import { clearAuthCookies } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  // Best-effort revocation on the backend (idempotent, ignore failures).
  if (refreshToken) {
    try {
      await fetch(`${BACKEND_API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
    } catch {
      // Network failure during logout must not block local sign-out.
    }
  }

  await clearAuthCookies();

  return NextResponse.json({ success: true, message: 'Logged out', timestamp: new Date().toISOString() });
}
