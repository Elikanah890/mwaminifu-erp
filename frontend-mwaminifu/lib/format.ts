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
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '-';
  }
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('en-US', {
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
  const base = product.baseUnitName || product.unit || 'unit';
  const plural = (name: string, n: number) => (n === 1 ? name : `${name}s`);
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
  if (!err) return 'Something went wrong';
  const e = err as { error?: { message?: string }; message?: string };
  if (e?.error?.message) return e.error.message;
  if (typeof e?.message === 'string' && e.message) return e.message;
  return 'Something went wrong';
}