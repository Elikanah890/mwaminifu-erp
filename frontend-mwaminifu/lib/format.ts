import { errorTranslationKey } from './i18n/labels';

let formatLocale: 'en' | 'sw' = 'sw';
let errorTranslator: ((key: string) => string) | null = null;

/** Let shared error formatting follow the active UI language. */
export function setErrorTranslator(fn: ((key: string) => string) | null): void {
  errorTranslator = fn;
}

/** Keep shared formatters in sync with the active UI language. */
export function setFormatLocale(locale: 'en' | 'sw'): void {
  formatLocale = locale;
}

export function getFormatLocale(): 'en' | 'sw' {
  return formatLocale;
}

function dateLocale(): string {
  return formatLocale === 'sw' ? 'sw-TZ' : 'en-US';
}

export function formatCurrency(amount: number, currency = 'TZS'): string {
  const value = Number(amount) || 0;
  return `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number): string {
  return (Number(value) || 0).toLocaleString('en-US');
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString(dateLocale(), { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '-';
  }
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString(dateLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

/**
 * Formats a stock quantity in base units, decomposing it into the largest
 * configured unit, e.g. 76 -> "76 bottles (3 cartons + 4 bottles)".
 */
export function formatStockWithUnits(product: {
  stockQuantity: number;
  baseUnitName?: string | null;
  unit?: string | null;
  unitConfigs?: Array<{ unitName: string; baseUnits: number }>;
}): string {
  const stock = Number(product.stockQuantity) || 0;
  const base = product.baseUnitName || product.unit || (formatLocale === 'sw' ? 'kipimo' : 'unit');
  // Swahili unit names are not pluralized with an English "s".
  const plural = (name: string, n: number) =>
    formatLocale === 'sw' || n === 1 ? name : `${name}s`;
  const big = (product.unitConfigs ?? [])
    .filter((c) => c.baseUnits > 1)
    .sort((a, b) => b.baseUnits - a.baseUnits)[0];
  if (!big) return `${stock} ${plural(base, stock)}`;
  const whole = Math.floor(stock / big.baseUnits);
  const rem = stock % big.baseUnits;
  const parts: string[] = [];
  if (whole > 0) parts.push(`${whole} ${plural(big.unitName, whole)}`);
  if (rem > 0 || whole === 0) parts.push(`${rem} ${plural(base, rem)}`);
  return `${stock} ${plural(base, stock)} (${parts.join(' + ')})`;
}

export function errorMessage(err: unknown): string {
  const e = err as { code?: string; error?: { code?: string; message?: string }; message?: string };
  const code = e?.code ?? e?.error?.code;
  if (errorTranslator) {
    return errorTranslator(errorTranslationKey(code) ?? 'errorGeneric');
  }
  if (!err) return 'Something went wrong';
  if (e?.error?.message) return e.error.message;
  if (typeof e?.message === 'string' && e.message) return e.message;
  return 'Something went wrong';
}