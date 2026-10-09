import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_API_URL, ACCESS_TOKEN_COOKIE } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

/**
 * Returns the current user's permissions straight from the backend on every
 * call (never cached), so owner-granted/revoked employee permissions take
 * effect on the next page load or focus — no re-login required.
 */
export async function GET() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }, timestamp: new Date().toISOString() },
      { status: 401 }
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${BACKEND_API_URL}/users/me/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
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
    return NextResponse.json(
      payload ?? { success: false, error: { code: 'UNAUTHORIZED', message: 'Session invalid' }, timestamp: new Date().toISOString() },
      { status: backendResponse.status }
    );
  }

  return NextResponse.json(payload);
}
