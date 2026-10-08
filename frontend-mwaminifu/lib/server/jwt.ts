/**
 * Edge/Node-compatible verification of the backend-issued access-token JWT.
 *
 * The frontend NEVER trusts a client-readable cookie for role. Instead it reads
 * the httpOnly `accessToken` cookie, verifies the HS256 signature with the same
 * secret as the backend, and extracts the role from the signed payload.
 *
 * This module must stay free of Node-only imports so it can run in Next.js
 * middleware (Edge runtime).
 */

export type SessionClaims = {
  sub: string;
  role: string;
  shopId?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
};

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function getJwtSecret(): string | null {
  return process.env.JWT_SECRET || process.env.BACKEND_JWT_SECRET || null;
}

/**
 * Verify the JWT signature and return its claims, or `null` if invalid.
 * Expiry is intentionally not enforced here so the BFF proxy can still perform
 * a transparent refresh using the refresh-token cookie.
 */
export async function verifyAccessToken(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null;
  const secret = getJwtSecret();
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signatureB64),
      encoder.encode(`${headerB64}.${payloadB64}`)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64))) as SessionClaims;
    if (!payload?.sub || !payload?.role) return null;
    return payload;
  } catch {
    return null;
  }
}
