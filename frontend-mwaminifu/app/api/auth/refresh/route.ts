import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_API_URL, REFRESH_TOKEN_COOKIE, generateCsrfToken } from '@/lib/server/auth';
import { clearAuthCookies, setAccessTokenCookie, setRefreshTokenCookie, setCsrfCookie } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'No session found' }, timestamp: new Date().toISOString() },
      { status: 401 }
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${BACKEND_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NETWORK_ERROR', message: 'Could not reach the authentication service' }, timestamp: new Date().toISOString() },
      { status: 502 }
    );
  }

  const payload = await backendResponse.json().catch(() => null);

  if (!backendResponse.ok) {
    await clearAuthCookies();
    return NextResponse.json(
      payload ?? { success: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' }, timestamp: new Date().toISOString() },
      { status: 401 }
    );
  }

  const data = (payload as { data?: { accessToken?: string; refreshToken?: string } })?.data;

  if (!data?.accessToken) {
    await clearAuthCookies();
    return NextResponse.json(
      { success: false, error: { code: 'REFRESH_FAILED', message: 'Could not refresh the session' }, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }

  await setAccessTokenCookie(data.accessToken);
  if (data.refreshToken) {
    await setRefreshTokenCookie(data.refreshToken);
  }
  await setCsrfCookie(generateCsrfToken());

  return NextResponse.json({ success: true, message: 'Session refreshed', timestamp: new Date().toISOString() });
}
