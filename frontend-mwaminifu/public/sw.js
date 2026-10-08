/* Mwaminifu ERP service worker.
 *
 * Caching strategy:
 *   - Static assets (/_next/static, /icons, /splash, fonts, images) -> CacheFirst (immutable)
 *   - Navigations (pages)                                            -> NetworkFirst -> cache -> /offline
 *   - Allow-listed GET API responses (products, categories, plans)   -> NetworkFirst -> cache (JSON only)
 *   - All other API responses (customers, sales, auth, admin, …)     -> network only, never cached
 *   - Sensitive pages (/system)                                     -> network only, never cached
 *
 * Caches are versioned; stale caches are removed on activate. A waiting worker
 * is kept so the app can show an "update available" prompt, and clientsClaim()
 * plus navigation preload keep navigation fast.
 */
const VERSION = 'mwaminifu-v5';
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

// API responses are cached ONLY when they match this explicit allow-list of
// non-sensitive GET endpoints (catalogue data). Everything else — customers,
// sales, employees, auth, users, admin, subscriptions, sync — is always
// fetched from the network and never written to Cache Storage. On a shared
// device this prevents one user's business data lingering for the next.
const CACHEABLE_API_PATTERNS = [
  /^\/api\/proxy\/shops\/[^/]+\/products$/,
  /^\/api\/proxy\/shops\/[^/]+\/products\/low-stock$/,
  /^\/api\/proxy\/shops\/[^/]+\/categories$/,
  /^\/api\/proxy\/plans$/,
  /^\/api\/proxy\/config$/,
];

const ASSET_EXT = /\.(?:css|js|mjs|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|txt|json|xml|webmanifest)$/i;

function isSensitivePage(pathname) {
  return SENSITIVE_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
function isCacheableApi(pathname) {
  return CACHEABLE_API_PATTERNS.some((re) => re.test(pathname));
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

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
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

  // API: only a small allow-list of catalogue GETs is cached. Every other API
  // request falls through to the browser's default (network-only) handling so
  // sensitive data is never persisted.
  if (url.pathname.startsWith('/api/')) {
    if (isCacheableApi(url.pathname)) {
      event.respondWith(networkFirstApi(request));
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
