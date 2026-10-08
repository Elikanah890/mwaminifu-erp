'use client';

import { getDb, isBrowser, type OutboxItem } from '@/lib/offline/db';
import { entityForEndpoint, shopIdFromEndpoint, uuid } from '@/lib/offline/ids';
import { requestBackgroundSync } from '@/lib/offline/background-sync';

export const MAX_ATTEMPTS = 5;

export type EnqueueInput = {
  method: OutboxItem['method'];
  endpoint: string;
  body?: unknown;
  clientId?: string;
  shopId?: string | null;
};

export function backoffDelay(attempts: number): number {
  // 2s, 4s, 8s, 16s, 32s (capped at 60s)
  return Math.min(2000 * 2 ** Math.max(0, attempts - 1), 60000);
}

export async function enqueue(input: EnqueueInput): Promise<OutboxItem | null> {
  if (!isBrowser()) return null;
  const clientId = input.clientId || uuid();
  const body =
    input.body && typeof input.body === 'object'
      ? { ...(input.body as Record<string, unknown>), clientId }
      : input.body;
  const item: OutboxItem = {
    clientId,
    entity: entityForEndpoint(input.endpoint),
    shopId: input.shopId ?? shopIdFromEndpoint(input.endpoint),
    method: input.method,
    endpoint: input.endpoint,
    body,
    createdAt: Date.now(),
    attempts: 0,
    status: 'pending',
    nextRetryAt: Date.now(),
  };
  try {
    const id = await getDb().outbox.add(item);
    item.id = id;
    requestBackgroundSync();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mwaminifu:sync'));
    }
    return item;
  } catch {
    return null;
  }
}

export async function pendingItems(): Promise<OutboxItem[]> {
  if (!isBrowser()) return [];
  try {
    return await getDb()
      .outbox.where('status')
      .equals('pending')
      .sortBy('createdAt');
  } catch {
    return [];
  }
}

export async function failedItems(): Promise<OutboxItem[]> {
  if (!isBrowser()) return [];
  try {
    return await getDb()
      .outbox.where('status')
      .equals('failed')
      .sortBy('createdAt');
  } catch {
    return [];
  }
}

export async function allItems(): Promise<OutboxItem[]> {
  if (!isBrowser()) return [];
  try {
    return await getDb().outbox.orderBy('createdAt').reverse().toArray();
  } catch {
    return [];
  }
}

export async function dueItems(now = Date.now()): Promise<OutboxItem[]> {
  const items = await pendingItems();
  return items.filter((i) => i.nextRetryAt <= now);
}

export async function removeItem(id?: number): Promise<void> {
  if (!isBrowser() || id == null) return;
  try {
    await getDb().outbox.delete(id);
  } catch {
    /* ignore */
  }
}

export async function scheduleRetry(item: OutboxItem, error: string): Promise<void> {
  if (!isBrowser() || item.id == null) return;
  const attempts = item.attempts + 1;
  const exhausted = attempts >= MAX_ATTEMPTS;
  try {
    await getDb().outbox.update(item.id, {
      attempts,
      lastError: error.slice(0, 300),
      status: exhausted ? 'failed' : 'pending',
      nextRetryAt: Date.now() + backoffDelay(attempts),
    });
  } catch {
    /* ignore */
  }
}

export async function markFailed(item: OutboxItem, error: string): Promise<void> {
  if (!isBrowser() || item.id == null) return;
  try {
    await getDb().outbox.update(item.id, { status: 'failed', lastError: error.slice(0, 300), attempts: MAX_ATTEMPTS });
  } catch {
    /* ignore */
  }
}

/** Reset failed items so they are retried immediately. */
export async function retryFailedItems(): Promise<number> {
  if (!isBrowser()) return 0;
  const failed = await failedItems();
  for (const item of failed) {
    if (item.id == null) continue;
    await getDb().outbox.update(item.id, { status: 'pending', attempts: 0, nextRetryAt: Date.now(), lastError: undefined });
  }
  return failed.length;
}

export async function clearOutbox(): Promise<void> {
  if (!isBrowser()) return;
  try {
    await getDb().outbox.clear();
  } catch {
    /* ignore */
  }
}
