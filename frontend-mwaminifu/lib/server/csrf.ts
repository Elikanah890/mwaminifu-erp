import { createHash } from 'node:crypto';

/**
 * Derive a deterministic CSRF token from the (httpOnly) access token.
 *
 * The double-submit cookie can be missing (session created before the cookie
 * existed), stale, or duplicated across hosts. Deriving the token from the
 * signed session means the BFF can always validate the header against the
 * current session, and the SPA can fetch a fresh token from `/api/auth/csrf`.
 *
 * The access token never reaches client JavaScript, so this value cannot be
 * forged cross-site.
 */
export function deriveCsrfToken(accessToken: string): string {
  return createHash('sha256')
    .update(`mwaminifu:csrf:${accessToken}`)
    .digest('base64url')
    .slice(0, 40);
}
