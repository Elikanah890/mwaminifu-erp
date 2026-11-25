const PROXY_BASE = '/api/proxy';
const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';

let csrfTokenMemo: string | null = null;

/** Read the double-submit CSRF token set by the BFF (non-httpOnly cookie). */
function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  return match ? match.slice(CSRF_COOKIE.length + 1) : null;
}

function getCsrfToken(): string | null {
  return csrfTokenMemo ?? readCsrfCookie();
}

/** Re-issue the session-bound CSRF token (also refreshes the cookie). */
async function refreshCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/csrf', { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as { data?: { token?: string } } | null;
    const token = payload?.data?.token ?? null;
    if (token) csrfTokenMemo = token;
    return token;
  } catch {
    return null;
  }
}

/**
 * Raw proxy fetch with no offline interception. Used by the sync engine to
 * replay queued writes and to pull server deltas.
 *
 * Queued writes MUST carry the CSRF double-submit header, otherwise the BFF
 * proxy rejects the replay with 403 and the item is marked permanently failed.
 * A rejected token self-heals once: fetch a session-bound token, then retry.
 */
export async function rawFetch(
  endpoint: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ response: Response; data: unknown }> {
  const method = (options.method || 'GET').toUpperCase();
  const isWrite = method !== 'GET' && method !== 'HEAD';

  let csrf = isWrite ? getCsrfToken() : null;
  if (isWrite && !csrf) csrf = await refreshCsrfToken();

  const send = (token: string | null) =>
    fetch(`${PROXY_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { [CSRF_HEADER]: token } : {}),
        ...(options.headers || {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

  let response = await send(csrf);
  let data = await response.json().catch(() => null);

  // CSRF is validated before the backend runs, so retrying cannot duplicate a
  // queued write.
  if (isWrite && response.status === 403 && (data as { error?: { code?: string } } | null)?.error?.code === 'CSRF_FAILED') {
    const fresh = await refreshCsrfToken();
    if (fresh) {
      response = await send(fresh);
      data = await response.json().catch(() => null);
    }
  }

  return { response, data };
}
