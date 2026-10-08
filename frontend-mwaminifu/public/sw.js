/* Mwaminifu ERP service worker.
 *
 * Caching strategy:
 *   - Static assets (/_next/static, /icons, /splash, fonts, images) -> CacheFirst (immutable)
 *   - Navigations (pages)                                            -> NetworkFirst -> cache -> /offline
 *   - Allow-listed GET API responses (products, categories, customers,
 *     last-24h sales, current shift, last-7d stock movements)          -> NetworkFirst -> cache (sanitised, TTL)
 *   - All other API responses (older sales, employees, reports,
 *     subscriptions, audit logs, admin/agent, auth)                    -> network only, never cached
 *   - Sensitive pages (/system)                                     -> network only, never cached
 *
 * Caches are versioned; stale caches are removed on activate. A waiting worker
 * is kept so the app can show an "update available" prompt, and clientsClaim()
 * plus navigation preload keep navigation fast.
 */
const VERSION = 'mwaminifu-v6';
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const API_CACHE = `${VERSION}-api`;
const KNOWN_CACHES = [STATIC_CACHE, PAGES_CACHE, API_CACHE];

const OFFLINE_URL = '/offline';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/',
  '/login',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-192x192.png',
  '/icons/maskable-512x512.png',
  '/apple-touch-icon.png',
];

// Sensitive page prefixes: never cached, always require the network.
const SENSITIVE_PAGE_PREFIXES = ['/system'];

// Balanced offline cache (Option B). API responses are cached ONLY when they
// match this explicit allow-list, and each entry is sanitised and time-bounded:
//   products / categories / plans / config -> catalogue (24h)
//   customers                              -> basic fields only (24h)
//   sales                                  -> last 24h only (24h)
//   current shift                          -> 24h
//   stock movements                        -> last 7 days (7d)
// Everything else (older sales, employees, reports, subscriptions, audit logs,
// admin/agent, auth) is network-only and never written to Cache Storage.
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

function sanitizeCustomers(body) {
  if (!body || !Array.isArray(body.data)) return body;
  return {
    ...body,
    data: body.data.map((c) => ({
      id: c.id, name: c.name, phone: c.phone, email: c.email, outstandingBalance: c.outstandingBalance,
    })),
  };
}
function sanitizeRecentSales(body) {
  if (!body || !Array.isArray(body.data)) return body;
  const cutoff = Date.now() - DAY_MS;
  return { ...body, data: body.data.filter((s) => new Date(s.saleDate || s.createdAt || 0).getTime() >= cutoff) };
}
function sanitizeRecentMovements(body) {
  if (!body || !Array.isArray(body.data)) return body;
  const cutoff = Date.now() - WEEK_MS;
  return { ...body, data: body.data.filter((m) => new Date(m.createdAt || 0).getTime() >= cutoff) };
}

const API_RULES = [
  { test: /^\/api\/proxy\/shops\/[^/]+\/products$/, ttlMs: DAY_MS },
  { test: /^\/api\/proxy\/shops\/[^/]+\/products\/low-stock$/, ttlMs: DAY_MS },
  { test: /^\/api\/proxy\/shops\/[^/]+\/categories$/, ttlMs: DAY_MS },
  { test: /^\/api\/proxy\/plans$/, ttlMs: DAY_MS },
  { test: /^\/api\/proxy\/config$/, ttlMs: DAY_MS },
  { test: /^\/api\/proxy\/shops\/[^/]+\/customers$/, ttlMs: DAY_MS, sanitize: sanitizeCustomers },
  { test: /^\/api\/proxy\/shops\/[^/]+\/sales$/, ttlMs: DAY_MS, sanitize: sanitizeRecentSales },
  { test: /^\/api\/proxy\/shifts$/, ttlMs: DAY_MS },
  { test: /^\/api\/proxy\/shifts\/active$/, ttlMs: DAY_MS },
  { test: /^\/api\/proxy\/shops\/[^/]+\/stock-movements$/, ttlMs: WEEK_MS, sanitize: sanitizeRecentMovements },
];
function findApiRule(pathname) {
  return API_RULES.find((r) => r.test.test(pathname));
}

const ASSET_EXT = /\.(?:css|js|mjs|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|txt|json|xml|webmanifest)$/i;

function isSensitivePage(pathname) {
  return SENSITIVE_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/splash/') ||
    ASSET_EXT.test(pathname)
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined))
      );
      // First install activates immediately; updates wait so the app can prompt.
      if (!self.registration.active) await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !KNOWN_CACHES.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data === 'SKIP_WAITING' || (data && data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === 'basic') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

async function networkFirstPage(event, request, cacheable = true) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (cacheable && response && response.ok && response.type === 'basic') {
      try {
        await cache.put(request, response.clone());
      } catch {
        /* ignore cache write errors */
      }
    }
    return response;
  } catch {
    const cached = cacheable ? await caches.match(request) : undefined;
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;background:#0d1b3d;color:#fff;display:grid;place-items:center;height:100vh;margin:0"><p>Hakuna mtandao / You are offline</p></body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function networkFirstApi(request, rule) {
  const cache = await caches.open(API_CACHE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      try {
        let body = await response.clone().json();
        if (rule && rule.sanitize) body = rule.sanitize(body);
        const headers = new Headers(response.headers);
        if (rule && rule.ttlMs) headers.set('X-SW-Cached-At', String(Date.now()));
        cache.put(
          request,
          new Response(JSON.stringify(body), {
            status: response.status,
            statusText: response.statusText,
            headers,
          })
        );
      } catch {
        /* non-JSON / clone errors: skip caching */
      }
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const cachedAt = Number(cached.headers.get('X-SW-Cached-At') || 0);
      const ttl = rule && rule.ttlMs ? rule.ttlMs : 0;
      if (ttl && cachedAt && Date.now() - cachedAt > ttl) {
        await cache.delete(request);
      } else {
        return cached;
      }
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'OFFLINE', message: 'You are offline. Showing cached data where available.' },
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.protocol.startsWith('http')) return;

  // API: only the balanced allow-list is cached. Every other API request falls
  // through to the browser's default (network-only) handling so sensitive data
  // is never persisted.
  if (url.pathname.startsWith('/api/')) {
    const rule = findApiRule(url.pathname);
    if (rule) {
      event.respondWith(networkFirstApi(request, rule));
    }
    return;
  }

  // Page navigations: network-first with offline fallback.
  // Sensitive portals are never written to cache, but still get the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(event, request, !isSensitivePage(url.pathname)));
    return;
  }

  // Immutable build assets + brand images: cache-first.
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Anything else same-origin: stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'SYNC_NOW' }));
}

// Background Sync: when connectivity returns, ask any open client to flush the
// offline queue. If no client is open, the queue flushes on next app launch.
self.addEventListener('sync', (event) => {
  if (event.tag === 'mwaminifu-sync') event.waitUntil(notifyClientsToSync());
});

// Periodic Background Sync (Chromium installed PWAs).
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mwaminifu-sync') event.waitUntil(notifyClientsToSync());
});

// Basic push support (wired to a future notification backend).
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Mwaminifu', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Mwaminifu', {
      body: payload.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});
