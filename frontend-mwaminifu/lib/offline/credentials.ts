'use client';

import { kvGet, kvSet } from '@/lib/offline/db';

type CachedCredential = {
  identity: string;
  salt: string;
  hash: string;
  user: { id: string; name: string; role: string; username?: string | null };
  updatedAt: number;
};

const KEY = (identity: string) => `cred:${identity.toLowerCase().trim()}`;

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hash(value: string): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  try {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return toHex(digest);
  } catch {
    return null;
  }
}

/** Store a salted hash of the password (never the plaintext) for offline verification. */
export async function cacheCredential(
  identity: string,
  password: string,
  user: CachedCredential['user']
): Promise<void> {
  if (!identity || !password) return;
  const salt = randomSalt();
  const digest = await hash(`${salt}:${password}`);
  if (!digest) return;
  const record: CachedCredential = { identity: identity.toLowerCase().trim(), salt, hash: digest, user, updatedAt: Date.now() };
  await kvSet(KEY(identity), record);
}

export async function hasOfflineCredential(identity?: string): Promise<boolean> {
  if (identity) return (await kvGet<CachedCredential>(KEY(identity))) != null;
  return (await kvGet<CachedCredential>(KEY('__none__'))) != null;
}

export async function verifyOfflineCredential(
  identity: string,
  password: string
): Promise<CachedCredential['user'] | null> {
  if (!identity || !password) return null;
  const record = await kvGet<CachedCredential>(KEY(identity));
  if (!record) return null;
  const digest = await hash(`${record.salt}:${password}`);
  if (!digest || digest !== record.hash) return null;
  return record.user;
}
