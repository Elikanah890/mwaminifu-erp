'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Shift, SaleListItem } from '@/lib/types';
import { formatCurrency, formatNumber, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, SkeletonTable, EmptyState } from '@/components/Spinner';
import StatsCard from '@/components/StatsCard';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import { Clock, TrendingUp, Hash, Scale } from 'lucide-react';

export default function EmployeeReportsPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userId = apiClient.getUser()?.id;

  useEffect(() => {
    if (!activeShopId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [s, salesRes] = await Promise.all([
          apiClient.get<Shift[]>('/shifts'),
          apiClient.get<SaleListItem[]>(`/shops/${activeShopId}/sales?userId=${userId}&limit=200`),
        ]);
        if (cancelled) return;
        if (s.data) setShifts(s.data);
        if (salesRes.data) setSales(salesRes.data);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeShopId, userId]);

  const totalSales = sales.reduce((s, x) => s + x.grandTotal, 0);
  const closedShifts = shifts.filter((s) => !s.isActive && s.discrepancy != null);
  const totalDiscrepancy = closedShifts.reduce((s, x) => s + (x.discrepancy ?? 0), 0);

  if (shopLoading || loading) {
    return (
      <PageWrapper title={t('myActivity')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SkeletonCard rows={5} />
          <SkeletonCard rows={5} />
        </div>
        <SkeletonTable rows={6} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={t('myActivity')} description={t('myActivity')} breadcrumb={['Employee', t('reports')]}>
      {error && <Reveal><div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div></Reveal>}

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('todaysSales')} value={formatCurrency(totalSales)} tone="teal" icon={<TrendingUp size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title={t('transactionsCount')} value={formatNumber(sales.length)} tone="navy" icon={<Hash size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title={t('shifts')} value={formatNumber(shifts.length)} tone="navy" icon={<Clock size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title={t('discrepancy')} value={formatCurrency(totalDiscrepancy)} tone={totalDiscrepancy === 0 ? 'gray' : 'red'} icon={<Scale size={20} />} /></StaggerItem>
      </Stagger>

      <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <StaggerItem>
          <ChartWrapper title={t('shifts')} subtitle={t('openingBalance')}>
            {shifts.length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">{t('date')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('openingBalance')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('countedCash')}</th>
                      <th className="px-3 py-2 text-right font-semibold">{t('discrepancy')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shifts.map((s) => (
                      <tr key={s.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                        <td className="px-3 py-2 text-muted-foreground">{formatDateTime(s.startedAt)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(s.openingCashBalance)}</td>
                        <td className="px-3 py-2 text-right">{s.countedCash != null ? formatCurrency(s.countedCash) : '-'}</td>
                        <td className="px-3 py-2 text-right font-semibold">{s.discrepancy == null ? '-' : s.discrepancy === 0 ? '0' : formatCurrency(s.discrepancy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartWrapper>
        </StaggerItem>

        <StaggerItem>
          <ChartWrapper title={`${t('expectedCash')} / ${t('countedCash')}`} subtitle={t('discrepancy')}>
            {closedShifts.length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <ul className="divide-y divide-border">
                {closedShifts.map((s) => (
                  <li key={s.id} className="py-3 rounded-lg px-2 transition-colors hover:bg-muted">
                    <p className="text-xs text-subtle-foreground">{formatDateTime(s.startedAt)}</p>
                    <div className="flex items-center justify-between text-sm mt-1"><span className="text-muted-foreground">{t('expectedCash')}</span><span className="font-medium text-foreground">{formatCurrency(s.expectedCash ?? 0)}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('countedCash')}</span><span className="font-medium text-foreground">{formatCurrency(s.countedCash ?? 0)}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t('discrepancy')}</span><Pill tone={s.discrepancy === 0 ? 'green' : 'red'}>{s.discrepancy === 0 ? '0' : formatCurrency(s.discrepancy ?? 0)}</Pill></div>
                  </li>
                ))}
              </ul>
            )}
          </ChartWrapper>
        </StaggerItem>
      </Stagger>

      <Reveal>
        <ChartWrapper title={t('salesHistory')} subtitle={t('mySales')}>
          {sales.length === 0 ? (
            <EmptyState message={t('noData')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                  <tr>
                    <th className="px-4 py-2 font-semibold">{t('receipt')}</th>
                    <th className="px-4 py-2 font-semibold">{t('date')}</th>
                    <th className="px-4 py-2 font-semibold">{t('customer')}</th>
                    <th className="px-4 py-2 text-right font-semibold">{t('total')}</th>
                    <th className="px-4 py-2 font-semibold">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                      <td className="px-4 py-2 font-medium text-foreground">{s.receiptNumber ?? '-'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatDateTime(s.saleDate)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.customer?.name ?? t('walkInCustomer')}</td>
                      <td className="px-4 py-2 text-right font-semibold text-secondary">{formatCurrency(s.grandTotal)}</td>
                      <td className="px-4 py-2"><Pill tone="teal">{s.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartWrapper>
      </Reveal>
    </PageWrapper>
  );
}
