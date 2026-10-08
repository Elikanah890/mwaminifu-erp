const PROXY_BASE = '/api/proxy';

/**
 * Raw proxy fetch with no offline interception. Used by the sync engine to
 * replay queued writes and to pull server deltas.
 */
export async function rawFetch(
  endpoint: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ response: Response; data: unknown }> {
  const response = await fetch(`${PROXY_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}
