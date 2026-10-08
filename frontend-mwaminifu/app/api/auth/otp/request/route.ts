import { NextResponse } from 'next/server';
import { BACKEND_API_URL } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { phone?: string } = {};
  try {
    body = await request.json();
  } catch {
    // fall through to validation error
  }

  const phone = body.phone?.trim();

  if (!phone) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Phone number is required' },
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${BACKEND_API_URL}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
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
        error: { code: 'REQUEST_FAILED', message: 'Failed to send OTP' },
        timestamp: new Date().toISOString(),
      },
      { status: backendResponse.status }
    );
  }

  return NextResponse.json(payload);
}
