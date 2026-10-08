import { cacheGet, cacheSet, isBrowser, clearOfflineData, purgeExpiredCache } from '@/lib/offline/db';
import { enqueue } from '@/lib/offline/queue';
import { cacheCredential, verifyOfflineCredential } from '@/lib/offline/credentials';
import { uuid } from '@/lib/offline/ids';

const PROXY_BASE = '/api/proxy';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
  _cached?: boolean;
  _queued?: boolean;
  cachedAt?: number;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
  };
  timestamp: string;
}

export class ApiErrorException extends Error {
  status: number;
  code: string;
  details?: Array<{ field: string; issue: string }>;

  constructor(status: number, error: { code: string; message: string; details?: Array<{ field: string; issue: string }> }) {
    super(error.message);
    this.name = 'ApiErrorException';
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

export type PublicUser = {
  id: string;
  name: string;
  username?: string | null;
  role: 'SYSTEM_OWNER' | 'AGENT' | 'BUSINESS_OWNER' | 'EMPLOYEE';
};

// Endpoints that must never be cached or queued offline (sensitive session data).
const SENSITIVE_PATTERNS = [/^\/admin/, /^\/users\/me/, /^\/device-sessions/, /^\/auth/, /^\/sync\/status/];
function isSensitive(endpoint: string): boolean {
  return SENSITIVE_PATTERNS.some((re) => re.test(endpoint));
}

// Balanced offline cache (Option B). Only the explicit allow-list below is
// persisted to the on-device (IndexedDB) cache, and each entry is sanitised and
// time-bounded:
//   - products / categories / plans / config  -> catalogue (24h TTL)
//   - customers                               -> basic fields only (24h TTL)
//   - sales                                   -> last 24h only (24h TTL)
//   - current shift                           -> 24h TTL
//   - stock movements                         -> last 7 days (7d TTL)
// NEVER cached: older sales, employee lists, reports, subscriptions, audit
// logs, admin/agent data, or anything not listed here.
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

type ApiPayload = { data?: unknown } & Record<string, unknown>;

function sanitizeCustomers(resp: ApiPayload): ApiPayload {
  if (!Array.isArray(resp?.data)) return resp;
  return {
    ...resp,
    data: (resp.data as Array<Record<string, unknown>>).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      creditLimit: c.creditLimit,
      outstandingBalance: c.outstandingBalance,
    })),
  };
}

function sanitizeRecentSales(resp: ApiPayload): ApiPayload {
  if (!Array.isArray(resp?.data)) return resp;
  const cutoff = Date.now() - DAY_MS;
  return {
    ...resp,
    data: (resp.data as Array<{ saleDate?: string; createdAt?: string }>).filter(
      (s) => new Date(s.saleDate ?? s.createdAt ?? 0).getTime() >= cutoff
    ),
  };
}

function sanitizeRecentMovements(resp: ApiPayload): ApiPayload {
  if (!Array.isArray(resp?.data)) return resp;
  const cutoff = Date.now() - WEEK_MS;
  return {
    ...resp,
    data: (resp.data as Array<{ createdAt?: string }>).filter(
      (m) => new Date(m.createdAt ?? 0).getTime() >= cutoff
    ),
  };
}

type CacheRule = { test: RegExp; ttlMs: number; sanitize?: (resp: ApiPayload) => ApiPayload };

const OFFLINE_CACHE_RULES: CacheRule[] = [
  { test: /^\/shops\/[^/]+\/products$/, ttlMs: DAY_MS },
  { test: /^\/shops\/[^/]+\/products\/low-stock$/, ttlMs: DAY_MS },
  { test: /^\/shops\/[^/]+\/categories$/, ttlMs: DAY_MS },
  { test: /^\/plans$/, ttlMs: DAY_MS },
  { test: /^\/config$/, ttlMs: DAY_MS },
  { test: /^\/shops\/[^/]+\/customers$/, ttlMs: DAY_MS, sanitize: sanitizeCustomers },
  { test: /^\/shops\/[^/]+\/sales$/, ttlMs: DAY_MS, sanitize: sanitizeRecentSales },
  { test: /^\/shifts$/, ttlMs: DAY_MS },
  { test: /^\/shifts\/active$/, ttlMs: DAY_MS },
  { test: /^\/shops\/[^/]+\/stock-movements$/, ttlMs: WEEK_MS, sanitize: sanitizeRecentMovements },
];

function offlineCacheRuleFor(endpoint: string): CacheRule | undefined {
  const path = endpoint.split('?')[0];
  return OFFLINE_CACHE_RULES.find((r) => r.test.test(path));
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

// The current user is held in memory only. It is hydrated from the
// server-verified `/api/auth/me` endpoint (which reads the httpOnly session
// cookie). Role is never read from a client-readable cookie.
let currentUser: PublicUser | null = null;

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith('csrfToken='));
  return match ? match.slice('csrfToken='.length) : null;
}

function toApiError(status: number, data: unknown): ApiErrorException {
  const err = (data as ApiError | null)?.error ?? {
    code: 'REQUEST_FAILED',
    message: `Request failed (${status})`,
  };
  return new ApiErrorException(status, err);
}

function isNetworkFailure(status: number, data: unknown): boolean {
  if (status === 502 || status === 503 || status === 0) return true;
  const code = (data as ApiError | null)?.error?.code;
  return code === 'NETWORK_ERROR' || code === 'ECONNREFUSED';
}

function optimistic<T>(payload: unknown, clientId: string): ApiResponse<T> {
  return {
    success: true,
    data: { ...(payload as Record<string, unknown>), clientId, _queued: true } as T,
    message: 'Saved offline — will sync automatically',
    timestamp: new Date().toISOString(),
    _queued: true,
  };
}

function withClientId(body: unknown, clientId: string): unknown {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return { ...(body as Record<string, unknown>), clientId };
  }
  return body;
}

/** Body stored/replayed for offline writes: tagged as offline + additive stock. */
function withOfflineFlags(body: unknown, clientId: string): unknown {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return { ...(body as Record<string, unknown>), clientId, isOffline: true, allowNegativeStock: true };
  }
  return body;
}

async function authExpiredIfNeeded(status: number): Promise<void> {
  if (status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
}

function subscriptionBlockedIfNeeded(status: number, data: unknown): void {
  if (status !== 402 || typeof window === 'undefined') return;
  const error = (data as ApiError | null)?.error;
  window.dispatchEvent(
    new CustomEvent('subscription:expired', {
      detail: { code: error?.code, message: error?.message },
    })
  );
}

async function request<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();

  // ---------------- GET ----------------
  if (method === 'GET') {
    try {
      const response = await fetch(`${PROXY_BASE}${endpoint}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        await authExpiredIfNeeded(response.status);
        subscriptionBlockedIfNeeded(response.status, data);
        throw toApiError(response.status, data);
      }
      const rule = offlineCacheRuleFor(endpoint);
      if (rule) {
        const toCache = rule.sanitize ? rule.sanitize(data as ApiPayload) : data;
        await cacheSet(endpoint, toCache, rule.ttlMs);
      }
      return data as ApiResponse<T>;
    } catch (e) {
      if (e instanceof ApiErrorException) throw e;
      const cached = await cacheGet<ApiResponse<T>>(endpoint);
      if (cached) {
        return { ...(cached.data as ApiResponse<T>), _cached: true, cachedAt: cached.updatedAt };
      }
      throw new ApiErrorException(0, { code: 'OFFLINE', message: 'You are offline and no cached data is available' });
    }
  }

  // ---------------- WRITES ----------------
  const clientId = uuid();
  const payload = withClientId(options.body, clientId);

  if (!isOnline() && !isSensitive(endpoint)) {
    const offlineBody = withOfflineFlags(options.body, clientId);
    await enqueue({ method: method as 'POST' | 'PUT' | 'PATCH' | 'DELETE', endpoint, body: offlineBody, clientId });
    return optimistic<T>(offlineBody, clientId);
  }

  const csrfToken = getCsrfToken();
  try {
    const response = await fetch(`${PROXY_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      await authExpiredIfNeeded(response.status);
      subscriptionBlockedIfNeeded(response.status, data);
      throw toApiError(response.status, data);
    }
    return data as ApiResponse<T>;
  } catch (e) {
    if (e instanceof ApiErrorException) throw e;
    if (isSensitive(endpoint)) throw e;
    // Network failure mid-write: queue it. The server never processed this
    // request, so replaying it will not create a duplicate.
    const offlineBody = withOfflineFlags(options.body, clientId);
    await enqueue({ method: method as 'POST' | 'PUT' | 'PATCH' | 'DELETE', endpoint, body: offlineBody, clientId });
    return optimistic<T>(offlineBody, clientId);
  }
}

class ApiClient {
  async login(username: string, password: string): Promise<ApiResponse<{ user: PublicUser }>> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (isNetworkFailure(response.status, data)) {
          const offline = await this.tryOfflineLogin(username, password);
          if (offline) return offline;
        }
        throw toApiError(response.status, data);
      }
      const user = (data as ApiResponse<{ user: PublicUser }>)?.data?.user;
      if (user) {
        await cacheCredential(username, password, user);
        this.setUser(user);
      }
      return data as ApiResponse<{ user: PublicUser }>;
    } catch (e) {
      if (e instanceof ApiErrorException) throw e;
      const offline = await this.tryOfflineLogin(username, password);
      if (offline) return offline;
      throw new ApiErrorException(0, { code: 'OFFLINE', message: 'You are offline and no cached login is available' });
    }
  }

  async requestOtp(phone: string): Promise<ApiResponse<{ message?: string; resendAfter?: number }>> {
    if (!isOnline()) throw new ApiErrorException(0, { code: 'OFFLINE', message: 'Requires internet to send OTP' });
    const response = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw toApiError(response.status, data);
    return data as ApiResponse<{ message?: string; resendAfter?: number }>;
  }

  async verifyOtp(phone: string, code: string): Promise<ApiResponse<{ user: PublicUser }>> {
    if (!isOnline()) {
      throw new ApiErrorException(0, { code: 'OFFLINE', message: 'OTP login requires internet. Use a cached device or reconnect.' });
    }
    const response = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp: code }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw toApiError(response.status, data);
    const user = (data as ApiResponse<{ user: PublicUser }>)?.data?.user;
    if (user) {
      await cacheCredential(phone, code, user);
      this.setUser(user);
    }
    return data as ApiResponse<{ user: PublicUser }>;
  }

  async employeeLogin(phone: string, pin: string): Promise<ApiResponse<{ user: PublicUser }>> {
    try {
      const response = await fetch('/api/auth/employee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (isNetworkFailure(response.status, data)) {
          const offline = await this.tryOfflineLogin(phone, pin);
          if (offline) return offline;
        }
        throw toApiError(response.status, data);
      }
      const user = (data as ApiResponse<{ user: PublicUser }>)?.data?.user;
      if (user) {
        await cacheCredential(phone, pin, user);
        this.setUser(user);
      }
      return data as ApiResponse<{ user: PublicUser }>;
    } catch (e) {
      if (e instanceof ApiErrorException) throw e;
      const offline = await this.tryOfflineLogin(phone, pin);
      if (offline) return offline;
      throw new ApiErrorException(0, { code: 'OFFLINE', message: 'You are offline and no cached login is available' });
    }
  }

  private async tryOfflineLogin(identity: string, secret: string): Promise<ApiResponse<{ user: PublicUser }> | null> {
    const user = await verifyOfflineCredential(identity, secret);
    if (!user) return null;
    this.setUser(user as PublicUser);
    return {
      success: true,
      data: { user: user as PublicUser },
      message: 'Offline login — data syncing is paused until you reconnect',
      timestamp: new Date().toISOString(),
    };
  }

  async logout(): Promise<void> {
    try {
      if (isOnline()) await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      currentUser = null;
      if (typeof document !== 'undefined') {
        document.cookie = 'user=; Max-Age=0; path=/;';
      }
      // Clear offline IndexedDB + PWA caches so a shared device does not retain
      // the previous user's business data after sign-out.
      await clearOfflineData();
    }
  }

  async refresh(): Promise<boolean> {
    if (!isOnline()) return false;
    const response = await fetch('/api/auth/refresh', { method: 'POST' });
    return response.ok;
  }

  setUser(user: PublicUser | null): void {
    currentUser = user;
  }

  getUser(): PublicUser | null {
    return currentUser;
  }

  /**
   * Hydrate the in-memory identity from the server-verified session. Call this
   * on app start (after a reload) before rendering role-based UI.
   */
  async loadUser(): Promise<PublicUser | null> {
    if (typeof window === 'undefined') return currentUser;
    // Drop any time-expired offline cache entries on app start.
    void purgeExpiredCache();
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 401) currentUser = null;
        return currentUser;
      }
      const payload = (await response.json()) as { data?: { user?: PublicUser } };
      currentUser = payload?.data?.user ?? null;
      return currentUser;
    } catch {
      return currentUser;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getUser();
  }

  isOffline(): boolean {
    return isBrowser() && typeof navigator !== 'undefined' && !navigator.onLine;
  }

  async get<T>(endpoint: string) {
    return request<T>(endpoint);
  }

  async post<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'PATCH', body });
  }

  async del<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, { method: 'DELETE', body });
  }

  async download(endpoint: string, filename: string): Promise<void> {
    const response = await fetch(`${PROXY_BASE}${endpoint}`);
    if (!response.ok) {
      throw new ApiErrorException(response.status, {
        code: 'DOWNLOAD_FAILED',
        message: `Download failed (${response.status})`,
      });
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const apiClient = new ApiClient();
