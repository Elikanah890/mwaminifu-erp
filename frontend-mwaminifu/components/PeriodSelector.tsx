'use client';

import { ReportPeriod } from '@/lib/types';
import { useI18n } from '@/lib/context/I18nContext';

const PERIODS: { id: ReportPeriod; labelKey: string }[] = [
  { id: 'today', labelKey: 'today' },
  { id: 'week', labelKey: 'thisWeek' },
  { id: 'month', labelKey: 'thisMonth' },
  { id: 'year', labelKey: 'thisYear' },
  { id: 'custom', labelKey: 'customRange' },
];

export default function PeriodSelector({
  period,
  onChange,
  from,
  to,
  onFrom,
  onTo,
  onExport,
}: {
  period: ReportPeriod;
  onChange: (p: ReportPeriod) => void;
  from?: string;
  to?: string;
  onFrom?: (v: string) => void;
  onTo?: (v: string) => void;
  onExport?: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <div className="flex flex-wrap gap-1.5 bg-card border border-border rounded-lg p-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === p.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={from ?? ''} onChange={(e) => onFrom?.(e.target.value)} className="input-field max-w-[160px]" />
          <span className="text-subtle-foreground">—</span>
          <input type="date" value={to ?? ''} onChange={(e) => onTo?.(e.target.value)} className="input-field max-w-[160px]" />
        </div>
      )}

      {onExport && (
        <button onClick={onExport} className="btn-outline text-sm ml-auto">{t('csvExport')}</button>
      )}
    </div>
  );
}
