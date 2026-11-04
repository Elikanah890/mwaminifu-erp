import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_API_URL, ACCESS_TOKEN_COOKIE } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }, timestamp: new Date().toISOString() },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${BACKEND_API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NETWORK_ERROR', message: 'Could not reach the authentication service' }, timestamp: new Date().toISOString() },
      { status: 502 }
    );
  }

  const payload = await backendResponse.json().catch(() => null);
  return NextResponse.json(payload ?? { success: backendResponse.ok, timestamp: new Date().toISOString() }, { status: backendResponse.status });
}
