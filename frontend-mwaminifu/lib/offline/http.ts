const PROXY_BASE = '/api/proxy';
const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';

/** Read the double-submit CSRF token set by the BFF (non-httpOnly cookie). */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  return match ? match.slice(CSRF_COOKIE.length + 1) : null;
}

/**
 * Raw proxy fetch with no offline interception. Used by the sync engine to
 * replay queued writes and to pull server deltas.
 *
 * Queued writes MUST carry the CSRF double-submit header, otherwise the BFF
 * proxy rejects the replay with 403 and the item is marked permanently failed.
 */
export async function rawFetch(
  endpoint: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ response: Response; data: unknown }> {
  const method = (options.method || 'GET').toUpperCase();
  const isWrite = method !== 'GET' && method !== 'HEAD';
  const csrf = isWrite ? getCsrfToken() : null;
  const response = await fetch(`${PROXY_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}
