import { NextResponse } from 'next/server';
import { BACKEND_API_URL, PublicUser, generateCsrfToken } from '@/lib/server/auth';
import { setAccessTokenCookie, setRefreshTokenCookie, setCsrfCookie } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { phone?: string; pin?: string } = {};
  try {
    body = await request.json();
  } catch {
    // fall through to validation error
  }

  const phone = body.phone?.trim();
  const pin = body.pin?.trim();

  if (!phone || !pin) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Phone and PIN are required' },
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${BACKEND_API_URL}/auth/employee/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin }),
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
        error: { code: 'LOGIN_FAILED', message: 'Invalid employee credentials' },
        timestamp: new Date().toISOString(),
      },
      { status: backendResponse.status }
    );
  }

  const data = (payload as {
    data?: {
      accessToken?: string;
      refreshToken?: string;
      tempToken?: string;
      requirePinChange?: boolean;
      user?: PublicUser;
    };
  })?.data;

  // First-time employees only get a temporary token and must set a PIN before
  // they can start a full session.
  if (!data?.accessToken || !data?.refreshToken) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'PIN_CHANGE_REQUIRED', message: 'A PIN change is required before signing in' },
        timestamp: new Date().toISOString(),
      },
      { status: 403 }
    );
  }

  if (!data.user) {
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
  await setRefreshTokenCookie(data.refreshToken);
  await setCsrfCookie(generateCsrfToken());

  return NextResponse.json({
    success: true,
    data: { user: data.user },
    message: 'Login successful',
    timestamp: new Date().toISOString(),
  });
}
