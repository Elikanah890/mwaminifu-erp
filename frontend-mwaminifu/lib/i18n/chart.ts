import { getFormatLocale } from '@/lib/format';

const SW_MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
const EN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Localize chart axis/tooltip labels without changing the underlying data. */
export function localizeChartLabel(label: unknown): string {
  const value = label == null ? '' : String(label);
  if (getFormatLocale() !== 'sw' || !value) return value;
  if (/^\d{1,2}:\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleDateString('sw-TZ', { month: 'short', day: 'numeric' });
    } catch {
      return value;
    }
  }
  const monthOnly = value.trim().toLowerCase();
  const idx = EN_MONTHS.indexOf(monthOnly);
  if (idx >= 0) return SW_MONTHS[idx];
  const m = value.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
  if (m) {
    const i = EN_MONTHS.indexOf(m[1].toLowerCase());
    if (i >= 0) return `${SW_MONTHS[i]} ${m[2]}`;
  }
  return value;
}
