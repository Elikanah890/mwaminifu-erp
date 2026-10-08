'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { SaleListItem, Shift } from '@/lib/types';
import { formatCurrency, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import ChartWrapper from '@/components/ChartWrapper';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Stagger, StaggerItem } from '@/components/motion';

type Activity = { sales: SaleListItem[]; shifts: Shift[] };

export default function EmployeeActivityPage() {
  const { loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.get<Activity>('/employee/activity')
      .then((res) => setActivity(res.data ?? null))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (shopLoading || loading) {
    return (
      <PageWrapper title={t('myActivity')}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard rows={6} />
          <SkeletonCard rows={6} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={t('myActivity')} description={t('mySales')} breadcrumb={['Employee', t('myActivity')]}>
      <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaggerItem>
          <ChartWrapper title={t('mySales')} subtitle={t('salesHistory')}>
            {!activity || activity.sales.length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                {activity.sales.map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-4 rounded-lg px-2 transition-colors hover:bg-muted">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{s.receiptNumber ?? t('sales')}</p>
                      <p className="text-xs text-subtle-foreground">{formatDateTime(s.saleDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-secondary">{formatCurrency(s.grandTotal)}</p>
                      <Pill tone="teal">{s.status}</Pill>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ChartWrapper>
        </StaggerItem>

        <StaggerItem>
          <ChartWrapper title={t('shifts')} subtitle={t('myActivity')}>
            {!activity || activity.shifts.length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                {activity.shifts.map((s) => (
                  <li key={s.id} className="py-3 rounded-lg px-2 transition-colors hover:bg-muted">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{formatDateTime(s.startedAt)}</span>
                      <Pill tone={s.isActive ? 'green' : 'gray'}>{s.isActive ? t('open') : t('closed')}</Pill>
                    </div>
                    <div className="flex items-center justify-between text-xs text-subtle-foreground mt-1">
                      <span>{t('openingBalance')}: {formatCurrency(s.openingCashBalance)}</span>
                      {s.discrepancy != null && (
                        <span className={s.discrepancy === 0 ? 'text-secondary' : 'text-danger'}>
                          {t('discrepancy')}: {formatCurrency(s.discrepancy)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ChartWrapper>
        </StaggerItem>
      </Stagger>
    </PageWrapper>
  );
}
