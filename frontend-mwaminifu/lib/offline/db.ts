'use client';

import Dexie, { type Table } from 'dexie';

export type OutboxStatus = 'pending' | 'failed';

export type OutboxItem = {
  id?: number;
  clientId: string;
  entity: string;
  shopId: string | null;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  body: unknown;
  createdAt: number;
  attempts: number;
  status: OutboxStatus;
  lastError?: string;
  nextRetryAt: number;
};

export type CacheItem = {
  key: string;
  data: unknown;
  updatedAt: number;
};

export type KvItem = {
  key: string;
  value: unknown;
};

class MwaminifuOfflineDB extends Dexie {
  outbox!: Table<OutboxItem, number>;
  cache!: Table<CacheItem, string>;
  kv!: Table<KvItem, string>;

  constructor() {
    super('mwaminifu-offline');
    this.version(1).stores({
      outbox: '++id, clientId, status, nextRetryAt, createdAt, shopId',
      cache: 'key, updatedAt',
      kv: 'key',
    });
  }
}

let _db: MwaminifuOfflineDB | null = null;

export function getDb(): MwaminifuOfflineDB {
  if (!_db) _db = new MwaminifuOfflineDB();
  return _db;
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

export const CACHE_PREFIX = 'GET:';

export async function cacheGet<T>(key: string): Promise<{ data: T; updatedAt: number } | null> {
  if (!isBrowser()) return null;
  try {
    const row = await getDb().cache.get(`${CACHE_PREFIX}${key}`);
    if (!row) return null;
    return { data: row.data as T, updatedAt: row.updatedAt };
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, data: unknown): Promise<void> {
  if (!isBrowser()) return;
  try {
    await getDb().cache.put({ key: `${CACHE_PREFIX}${key}`, data, updatedAt: Date.now() });
  } catch {
    /* cache writes are best-effort */
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!isBrowser()) return null;
  try {
    const row = await getDb().kv.get(key);
    return row ? (row.value as T) : null;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (!isBrowser()) return;
  try {
    await getDb().kv.put({ key, value });
  } catch {
    /* best-effort */
  }
}

/**
 * Wipe all locally-stored offline data: cached GET responses, the pending
 * offline write queue, key/value state, and the PWA Cache Storage. Used on
 * sign-out and by the user-facing "Clear offline data" action so shared
 * devices do not retain a previous user's business data.
 */
export async function clearOfflineData(): Promise<void> {
  if (!isBrowser()) return;
  try {
    const db = getDb();
    await Promise.all([db.outbox.clear(), db.cache.clear(), db.kv.clear()]);
  } catch {
    /* ignore IndexedDB errors */
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* Cache Storage may be unavailable */
  }
}
