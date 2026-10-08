import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  BACKEND_API_URL,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_TIMEOUT_SECONDS,
  REFRESH_TOKEN_MAX_AGE,
  baseCookieOptions,
} from '@/lib/server/auth';
import { clearAuthCookies } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };

// Only forward metadata headers. `content-encoding` and `content-length` are
// intentionally omitted: the fetch() client (undici) transparently decompresses
// the backend response body, so forwarding the original compressed headers would
// corrupt the body (double-encoding) and break JSON parsing and file downloads.
const PASSTHROUGH_RESPONSE_HEADERS = ['content-type', 'content-disposition'];

async function proxy(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const cookieStore = await cookies();

  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  const search = request.nextUrl.searchParams.toString();
  const targetPath = path.join('/');
  const url = `${BACKEND_API_URL}/${targetPath}${search ? `?${search}` : ''}`;

  const method = request.method;

  // CSRF protection (double-submit token + same-origin check) for all
  // state-changing requests proxied with the session cookie.
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { success: false, error: { code: 'CSRF_FAILED', message: 'Cross-site request blocked' }, timestamp: new Date().toISOString() },
        { status: 403 }
      );
    }
    const csrfCookie = cookieStore.get(CSRF_COOKIE)?.value;
    const csrfHeader = request.headers.get(CSRF_HEADER);
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json(
        { success: false, error: { code: 'CSRF_FAILED', message: 'Missing or invalid CSRF token' }, timestamp: new Date().toISOString() },
        { status: 403 }
      );
    }
  }

  let body: BodyInit | undefined;
  const contentType = request.headers.get('content-type') || '';
  if (method !== 'GET' && method !== 'HEAD') {
    if (contentType.includes('application/json')) {
      body = await request.text();
    } else {
      body = request.body ?? undefined;
    }
  }

  const doFetch = (token?: string) =>
    fetch(url, {
      method,
      headers: {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      cache: 'no-store',
    });

  let response = await doFetch(accessToken);

  // Transparent token refresh: a 401 with a valid refresh token triggers a
  // silent refresh and a single retry.
  if (response.status === 401 && refreshToken) {
    const refreshed = await tryRefresh(refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      cookieStore.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, baseCookieOptions(SESSION_TIMEOUT_SECONDS, true));
      if (refreshed.refreshToken) {
        cookieStore.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, baseCookieOptions(REFRESH_TOKEN_MAX_AGE, true));
      }
      response = await doFetch(accessToken);
    } else {
      await clearAuthCookies();
    }
  }

  const headers = new Headers();
  for (const name of PASSTHROUGH_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }

  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    headers,
  });

  // Sliding session: each authenticated request extends the access-token
  // cookie, so the 30-minute timeout is inactivity-based.
  if (accessToken && response.status < 500) {
    nextResponse.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, baseCookieOptions(SESSION_TIMEOUT_SECONDS, true));
  }

  return nextResponse;
}

async function tryRefresh(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const payload = (await res.json().catch(() => null)) as {
      data?: { accessToken?: string; refreshToken?: string };
    } | null;
    const data = payload?.data;
    if (!data?.accessToken) return null;
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

export const GET = (req: NextRequest, ctx: Ctx) => proxy(req, ctx);
export const POST = (req: NextRequest, ctx: Ctx) => proxy(req, ctx);
export const PUT = (req: NextRequest, ctx: Ctx) => proxy(req, ctx);
export const PATCH = (req: NextRequest, ctx: Ctx) => proxy(req, ctx);
export const DELETE = (req: NextRequest, ctx: Ctx) => proxy(req, ctx);
