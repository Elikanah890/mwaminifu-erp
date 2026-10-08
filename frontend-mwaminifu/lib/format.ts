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

export function errorMessage(err: unknown): string {
  if (!err) return 'Something went wrong';
  const e = err as { error?: { message?: string }; message?: string };
  if (e?.error?.message) return e.error.message;
  if (typeof e?.message === 'string' && e.message) return e.message;
  return 'Something went wrong';
}