/**
 * Shared auth constants and pure helpers used by both the Next.js middleware
 * (Edge runtime) and the BFF route handlers (Node runtime).
 *
 * IMPORTANT: this module must NOT import `next/headers` (or any Node-only
 * module) because it is imported by `middleware.ts`, which runs on the Edge
 * runtime. Cookie *mutation* helpers live in `lib/server/session.ts`.
 */

const DEFAULT_BACKEND = 'http://localhost:5000/api/v1';

export const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_BACKEND
).replace(/\/+$/, '');

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
// @deprecated Role is no longer stored in a client-readable cookie. Kept only
// so existing cookies can be cleared. Role is derived from the signed JWT.
export const USER_COOKIE = 'user';

/** Double-submit CSRF token cookie/header names. */
export const CSRF_COOKIE = 'csrfToken';
export const CSRF_HEADER = 'x-csrf-token';

/** Generate a cryptographically-random CSRF token. */
export function generateCsrfToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/** Inactivity window before the session expires (seconds). */
export const SESSION_TIMEOUT_SECONDS = 30 * 60;

/** Refresh token cookie lifetime (seconds) — matches the backend 60-day TTL. */
export const REFRESH_TOKEN_MAX_AGE = 60 * 24 * 60 * 60;

export type PublicUser = {
  id: string;
  name: string;
  username?: string | null;
  role: 'SYSTEM_OWNER' | 'AGENT' | 'BUSINESS_OWNER' | 'EMPLOYEE';
};

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function baseCookieOptions(maxAge: number, httpOnly: boolean) {
  return {
    httpOnly,
    sameSite: 'lax' as const,
    secure: isProduction(),
    path: '/',
    maxAge,
  };
}

/** Serialize the non-sensitive public user profile into a client-readable cookie. */
export function serializeUser(user: PublicUser): string {
  return JSON.stringify({
    id: user.id,
    name: user.name,
    username: user.username ?? null,
    role: user.role,
  });
}

export function parseUser(raw: string | undefined): PublicUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.role) {
      return parsed as PublicUser;
    }
    return null;
  } catch {
    return null;
  }
}
