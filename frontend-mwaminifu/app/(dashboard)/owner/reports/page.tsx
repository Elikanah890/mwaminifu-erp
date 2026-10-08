'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { SalesAnalytics, ProfitAnalytics, ReportPeriod } from '@/lib/types';
import { formatCurrency, formatNumber, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import StatsCard from '@/components/StatsCard';
import PeriodSelector from '@/components/PeriodSelector';
import { useToast } from '@/components/Toast';
import { TrendingUp, TrendingDown, Package, Receipt, Wallet, Boxes } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function ReportsOverviewPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sales, setSales] = useState<SalesAnalytics | null>(null);
  const [profit, setProfit] = useState<ProfitAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams({ period });
    if (period === 'custom' && from) q.set('from', from);
    if (period === 'custom' && to) q.set('to', to);
    Promise.all([
      apiClient.get<SalesAnalytics>(`/shops/${activeShopId}/analytics/sales?${q.toString()}`),
      apiClient.get<ProfitAnalytics>(`/shops/${activeShopId}/analytics/profit?${q.toString()}`),
    ])
      .then(([s, p]) => {
        if (cancelled) return;
        setSales(s.data ?? null);
        setProfit(p.data ?? null);
      })
      .catch((err) => { if (!cancelled) toast(errorMessage(err), 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeShopId, period, from, to]);

  const ps = profit?.summary;
  const topProducts = (sales?.perProduct ?? []).slice(0, 8);

  return (
    <PageWrapper title={t('reportsOverview')} description={t('reports')} breadcrumb={['Owner', t('reports')]}>
      <PeriodSelector period={period} onChange={setPeriod} from={from} to={to} onFrom={setFrom} onTo={setTo} />

      {shopLoading || loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
          <SkeletonCard rows={6} />
        </div>
      ) : (
        <>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StaggerItem><StatsCard title={t('revenue')} value={formatCurrency(ps?.totalRevenue ?? 0)} tone="teal" icon={<TrendingUp size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('cogs')} value={formatCurrency(ps?.cogs ?? 0)} tone="navy" icon={<Boxes size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('grossProfit')} value={formatCurrency(ps?.grossProfit ?? 0)} tone="gold" icon={<Package size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('expenses')} value={formatCurrency(ps?.totalExpenses ?? 0)} tone="red" icon={<Receipt size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('netProfit')} value={formatCurrency(ps?.netProfit ?? 0)} tone={((ps?.netProfit ?? 0) >= 0) ? 'teal' : 'red'} icon={<Wallet size={20} />} /></StaggerItem>
          </Stagger>

          <ChartWrapper title={t('salesTrend')} subtitle={t('revenue')} className="mb-6">
            {(sales?.trend ?? []).length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sales?.trend ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), t('revenue')]} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--secondary)" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartWrapper>

          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartWrapper title={t('byPaymentMethod')} subtitle={t('paymentMethod')}>
              {(sales?.paymentMethods ?? []).length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <div className="space-y-4">
                  {sales?.paymentMethods.map((p) => {
                    const total = (sales.paymentMethods ?? []).reduce((s, x) => s + x.amount, 0);
                    const pct = total > 0 ? (p.amount / total) * 100 : 0;
                    return (
                      <div key={p.method}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-foreground capitalize">{p.method}</span>
                          <span className="text-muted-foreground">{pct.toFixed(0)}% · {formatCurrency(p.amount)}</span>
                        </div>
                        <div className="h-3 bg-muted-2 rounded-full overflow-hidden">
                          <div className="h-full bg-secondary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartWrapper>

            <ChartWrapper title={t('topProducts')} subtitle={t('byProduct')}>
              {topProducts.length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                      <tr>
                        <th className="px-4 py-3">{t('products')}</th>
                        <th className="px-4 py-3 text-right">{t('quantity')}</th>
                        <th className="px-4 py-3 text-right">{t('revenue')}</th>
                        <th className="px-4 py-3 text-right">{t('profit')}</th>
                        <th className="px-4 py-3 text-right">{t('margin')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topProducts.map((p) => (
                        <tr key={p.productId} className="hover:bg-muted transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(p.quantity)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-secondary">{formatCurrency(p.revenue)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.profit)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${p.margin >= 0 ? 'text-secondary' : 'text-danger'}`}>
                              {p.margin >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(p.margin).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartWrapper>
          </Reveal>
        </>
      )}
    </PageWrapper>
  );
}
