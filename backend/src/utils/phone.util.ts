/**
 * Normalise a phone number to canonical Tanzanian form: `255XXXXXXXXX`.
 * Accepts `+255754000000`, `255754000000`, `0754000000`, `754000000` and
 * variants with spaces/dashes/parentheses.
 */
export function normalizePhone(input: string): string {
  const digits = (input || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('255')) return digits;
  if (digits.startsWith('0')) return `255${digits.slice(1)}`;
  if (digits.length === 9) return `255${digits}`;
  return digits;
}

/**
 * Every plausible storage format for a phone number, used for DB lookups since
 * legacy rows were saved in mixed formats (`0754...` and `255754...`).
 */
export function phoneVariants(input: string): string[] {
  const canonical = normalizePhone(input);
  const local = canonical.startsWith('255') ? `0${canonical.slice(3)}` : canonical;
  return Array.from(new Set([input, canonical, `+${canonical}`, local].filter(Boolean)));
}
