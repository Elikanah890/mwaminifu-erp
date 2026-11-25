import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_API_URL, REFRESH_TOKEN_COOKIE, PublicUser } from '@/lib/server/auth';
import { setAccessTokenCookie, setRefreshTokenCookie, setCsrfCookie } from '@/lib/server/session';
import { deriveCsrfToken } from '@/lib/server/csrf';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { email?: string; password?: string } = {};
  try {
    body = await request.json();
  } catch {
    // fall through to validation error
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${BACKEND_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Could not reach the authentication service' },
        timestamp: new Date().toISOString(),
      },
      { status: 502 }
    );
  }

  const payload = await backendResponse.json().catch(() => null);

  if (!backendResponse.ok) {
    return NextResponse.json(
      payload ?? {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
        timestamp: new Date().toISOString(),
      },
      { status: backendResponse.status }
    );
  }

  const data = (payload as {
    data?: {
      accessToken?: string;
      refreshToken?: string;
      requiresPasswordChange?: boolean;
      user?: PublicUser;
    };
  })?.data;

  if (!data?.accessToken || !data?.user) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'LOGIN_FAILED', message: 'Unexpected authentication response' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  await setAccessTokenCookie(data.accessToken);
  if (data.refreshToken) {
    await setRefreshTokenCookie(data.refreshToken);
  } else {
    // A restricted password-change session must not inherit an older refresh
    // token from a previous user on the same browser.
    (await cookies()).delete(REFRESH_TOKEN_COOKIE);
  }
  // Deterministic per session so duplicate/stale cookies cannot disagree.
  await setCsrfCookie(deriveCsrfToken(data.accessToken));

  return NextResponse.json({
    success: true,
    data: {
      user: data.user,
      requiresPasswordChange: Boolean(data.requiresPasswordChange),
    },
    message: 'Login successful',
    timestamp: new Date().toISOString(),
  });
}
