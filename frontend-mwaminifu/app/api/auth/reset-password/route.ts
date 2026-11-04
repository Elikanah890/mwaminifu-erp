import { NextResponse } from 'next/server';
import { BACKEND_API_URL } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  try {
    const backendResponse = await fetch(`${BACKEND_API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const payload = await backendResponse.json().catch(() => null);
    return NextResponse.json(payload ?? { success: backendResponse.ok, timestamp: new Date().toISOString() }, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NETWORK_ERROR', message: 'Could not reach the authentication service' }, timestamp: new Date().toISOString() },
      { status: 502 }
    );
  }
}
