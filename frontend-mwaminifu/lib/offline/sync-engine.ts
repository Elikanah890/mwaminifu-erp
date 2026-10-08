'use client';

import { rawFetch } from '@/lib/offline/http';
import { dueItems, pendingItems, failedItems, removeItem, scheduleRetry, markFailed, retryFailedItems } from '@/lib/offline/queue';
import { kvGet, kvSet } from '@/lib/offline/db';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'failed';

export type PriceConflict = {
  productId: string;
  name: string;
  from: number;
  to: number;
};

export type SyncSnapshot = {
  status: SyncStatus;
  pending: number;
  failed: number;
  syncing: number;
  lastSyncAt: number | null;
  lastError: string | null;
  conflicts: PriceConflict[];
};

type Listener = (snapshot: SyncSnapshot) => void;

type SnapshotProduct = { id: string; name: string; sellingPrice: number; stockQuantity?: number };

class SyncEngine {
  private listeners = new Set<Listener>();
  private snapshot: SyncSnapshot = {
    status: 'online',
    pending: 0,
    failed: 0,
    syncing: 0,
    lastSyncAt: null,
    lastError: null,
    conflicts: [],
  };
  private running = false;
  private started = false;
  private timer: ReturnType<typeof setInterval> | undefined;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): SyncSnapshot {
    return this.snapshot;
  }

  private emit(partial: Partial<SyncSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    this.listeners.forEach((l) => l(this.snapshot));
  }

  async refreshCounts(): Promise<void> {
    try {
      const [pending, failed, last] = await Promise.all([
        pendingItems(),
        failedItems(),
        kvGet<number>('lastSyncAt'),
      ]);
      this.emit({ pending: pending.length, failed: failed.length, lastSyncAt: last ?? null });
    } catch {
      /* ignore */
    }
  }

  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    const online = () => {
      this.emit({ status: 'online' });
      void this.run('online');
    };
    const offline = () => this.emit({ status: 'offline' });

    window.addEventListener('online', online);
    window.addEventListener('offline', offline);

    let debounce: ReturnType<typeof setTimeout> | undefined;
    window.addEventListener('mwaminifu:sync', () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (navigator.onLine) void this.run('queue');
      }, 700);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void this.run('focus');
    });
    window.addEventListener('focus', () => {
      if (navigator.onLine) void this.run('focus');
    });

    this.timer = setInterval(() => {
      if (navigator.onLine) void this.run('poll');
    }, 5 * 60 * 1000);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'SYNC_NOW') void this.run('background');
      });
    }

    this.emit({ status: navigator.onLine ? 'online' : 'offline' });
    void this.refreshCounts();
    if (navigator.onLine) void this.run('start');
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.started = false;
  }

  async run(reason: string): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.emit({ status: 'offline' });
      return;
    }
    if (this.running) return;
    this.running = true;
    this.emit({ status: 'syncing' });

    try {
      await this.push();
      await this.pull();
      await this.refreshCounts();
      const now = Date.now();
      await kvSet('lastSyncAt', now);
      const failed = await failedItems();
      this.emit({ status: failed.length ? 'failed' : 'online', lastSyncAt: now, lastError: null });
    } catch (e) {
      this.emit({ status: 'failed', lastError: e instanceof Error ? e.message : String(e) });
    } finally {
      this.running = false;
      void reason;
    }
  }

  private async push(): Promise<void> {
    const items = await dueItems();
    for (const item of items) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break;
      try {
        const { response } = await rawFetch(item.endpoint, { method: item.method, body: item.body });
        if (response.ok) {
          await removeItem(item.id);
        } else if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
          // Permanent client error: retrying will not help.
          await markFailed(item, `Rejected (HTTP ${response.status})`);
        } else {
          await scheduleRetry(item, `HTTP ${response.status}`);
        }
      } catch (e) {
        await scheduleRetry(item, e instanceof Error ? e.message : 'network error');
      }
    }
  }

  private async pull(): Promise<void> {
    const shopId = await kvGet<string>('activeShopId');
    if (!shopId) return;
    const since = (await kvGet<string>('lastPullAt')) || new Date(0).toISOString();
    const params = new URLSearchParams({ shopId, since, limit: '500' });
    const { response, data } = await rawFetch(`/sync/pull?${params.toString()}`);
    if (!response.ok || !data || typeof data !== 'object') return;
    const payload = (data as { data?: { changes?: Record<string, unknown>; serverVersion?: string } }).data;
    if (!payload) return;
    if (payload.serverVersion) await kvSet('lastPullAt', payload.serverVersion);
    const products = (payload.changes?.products as SnapshotProduct[]) || [];
    if (products.length) await this.detectPriceChanges(products);
  }

  private async detectPriceChanges(products: SnapshotProduct[]): Promise<void> {
    const snapshot = (await kvGet<Record<string, number>>('priceSnapshot')) || {};
    const names = (await kvGet<Record<string, string>>('priceNames')) || {};
    const conflicts: PriceConflict[] = [];
    for (const p of products) {
      const previous = snapshot[p.id];
      if (previous != null && previous !== p.sellingPrice) {
        conflicts.push({ productId: p.id, name: p.name, from: previous, to: p.sellingPrice });
      }
      snapshot[p.id] = p.sellingPrice;
      names[p.id] = p.name;
    }
    await kvSet('priceSnapshot', snapshot);
    await kvSet('priceNames', names);
    if (conflicts.length) this.emit({ conflicts });
  }

  dismissConflicts(): void {
    this.emit({ conflicts: [] });
  }

  syncNow(): Promise<void> {
    return this.run('manual');
  }

  async retryFailed(): Promise<void> {
    await retryFailedItems();
    await this.refreshCounts();
    await this.run('retry');
  }
}

let _engine: SyncEngine | null = null;

export function getSyncEngine(): SyncEngine {
  if (!_engine) _engine = new SyncEngine();
  return _engine;
}
