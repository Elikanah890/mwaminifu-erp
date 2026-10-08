import { cookies } from 'next/headers';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USER_COOKIE,
  CSRF_COOKIE,
  SESSION_TIMEOUT_SECONDS,
  REFRESH_TOKEN_MAX_AGE,
  baseCookieOptions,
  serializeUser,
  PublicUser,
} from '@/lib/server/auth';

/** Clear all auth cookies (server-side, used by the BFF route handlers). */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(USER_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

/**
 * Issue a double-submit CSRF token. The cookie is intentionally readable by
 * JavaScript (not httpOnly) so the SPA can echo it back in the `x-csrf-token`
 * header; the server compares cookie vs header on state-changing requests.
 */
export async function setCsrfCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, baseCookieOptions(REFRESH_TOKEN_MAX_AGE, false));
}

export async function setAccessTokenCookie(accessToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, baseCookieOptions(SESSION_TIMEOUT_SECONDS, true));
}

export async function setRefreshTokenCookie(refreshToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, baseCookieOptions(REFRESH_TOKEN_MAX_AGE, true));
}

export async function setUserCookie(user: PublicUser) {
  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE, serializeUser(user), baseCookieOptions(REFRESH_TOKEN_MAX_AGE, false));
}
