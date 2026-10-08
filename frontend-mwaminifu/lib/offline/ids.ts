'use client';

/** RFC4122 v4 UUID, with a fallback for non-secure contexts. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

const ENDPOINT_ENTITY: Array<[RegExp, string]> = [
  [/\/sales(?:\?|$|\/)/, 'sales'],
  [/\/expenses(?:\?|$|\/)/, 'expenses'],
  [/\/credit-payment/, 'creditPayments'],
  [/\/products(?:\?|$|\/)/, 'products'],
  [/\/customers(?:\?|$|\/)/, 'customers'],
  [/\/suppliers(?:\?|$|\/)/, 'suppliers'],
  [/\/purchases(?:\?|$|\/)/, 'purchases'],
  [/\/loans(?:\?|$|\/)/, 'loans'],
  [/\/cash(?:\?|$|\/)/, 'cash'],
  [/\/stock/, 'stock'],
];

/** Best-effort entity name derived from an API endpoint path. */
export function entityForEndpoint(endpoint: string): string {
  for (const [re, entity] of ENDPOINT_ENTITY) {
    if (re.test(endpoint)) return entity;
  }
  return 'other';
}

/** Extract a shopId from an endpoint like /shops/<id>/... (used for grouping). */
export function shopIdFromEndpoint(endpoint: string): string | null {
  const m = endpoint.match(/\/shops\/([^/?]+)/);
  return m ? m[1] : null;
}
