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
import { deriveCsrfToken } from '@/lib/server/csrf';
import { isSameOrigin } from '@/lib/server/origin';

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
    if (!isSameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: { code: 'CSRF_FAILED', message: 'Cross-site request blocked' }, timestamp: new Date().toISOString() },
        { status: 403 }
      );
    }
    const csrfCookie = cookieStore.get(CSRF_COOKIE)?.value;
    const csrfHeader = request.headers.get(CSRF_HEADER);
    // Accept either the double-submit cookie value or the token derived from
    // the current session. The derived form survives missing, stale or
    // duplicated csrfToken cookies (previously blocked cashiers from selling).
    const sessionCsrf = accessToken ? deriveCsrfToken(accessToken) : null;
    const csrfValid = Boolean(csrfHeader) && (csrfHeader === csrfCookie || csrfHeader === sessionCsrf);
    if (!csrfValid) {
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
      // Buffer non-JSON bodies (multipart uploads, empty DELETE bodies).
      // Passing a ReadableStream to fetch() in Node requires `duplex: 'half'`,
      // which Next's fetch typings reject, and an empty stream would still be
      // sent as a body. Buffering is bounded by the 25 MB Nginx limit.
      const buffer = await request.arrayBuffer();
      body = buffer.byteLength > 0 ? buffer : undefined;
    }
  }

  const shopId = request.headers.get('x-shop-id');
  const doFetch = (token?: string) =>
    fetch(url, {
      method,
      headers: {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(shopId ? { 'X-Shop-Id': shopId } : {}),
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
      // Keep the CSRF cookie in lockstep with the rotated session.
      cookieStore.set(CSRF_COOKIE, deriveCsrfToken(refreshed.accessToken), baseCookieOptions(REFRESH_TOKEN_MAX_AGE, false));
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
