/**
 * Same-origin (CSRF) check for state-changing BFF requests.
 *
 * Behind a reverse proxy, `request.nextUrl.origin` can resolve to the internal
 * upstream (e.g. http://127.0.0.1:3000) instead of the public origin, which
 * would reject every legitimate browser request. Compare the browser Origin's
 * host against the forwarded Host header instead, and honour the forwarded
 * scheme when the proxy provides one.
 *
 * Requests without an Origin header (native mobile clients, server-to-server)
 * are allowed; they are not subject to browser CSRF.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = (forwardedHost?.split(',')[0] ?? request.headers.get('host') ?? '')
    .trim()
    .toLowerCase();
  if (!host) return false;

  const originHost = parsed.host.toLowerCase();
  if (originHost !== host) {
    const stripWww = (value: string) => value.replace(/^www\./, '');
    if (stripWww(originHost) !== stripWww(host)) return false;
  }

  const forwardedProto = (request.headers.get('x-forwarded-proto') ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (forwardedProto && parsed.protocol !== `${forwardedProto}:`) return false;

  return true;
}
