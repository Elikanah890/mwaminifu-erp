'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { SalesAnalytics, ReportPeriod } from '@/lib/types';
import { formatCurrency, formatNumber, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import StatsCard from '@/components/StatsCard';
import PeriodSelector from '@/components/PeriodSelector';
import { useToast } from '@/components/Toast';
import { TrendingUp, Receipt, Package, Users, TrendingDown, TrendingUp as Up, Download, FileText } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';

export default function SalesReportPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams({ period });
    if (period === 'custom' && from) q.set('from', from);
    if (period === 'custom' && to) q.set('to', to);
    apiClient.get<SalesAnalytics>(`/shops/${activeShopId}/analytics/sales?${q.toString()}`)
      .then((res) => { if (!cancelled) setData(res.data ?? null); })
      .catch((err) => { if (!cancelled) toast(errorMessage(err), 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeShopId, period, from, to]);

  const payData = useMemo(() => {
    const total = (data?.paymentMethods ?? []).reduce((s, p) => s + p.amount, 0);
    return (data?.paymentMethods ?? []).map((p) => ({ ...p, pct: total > 0 ? (p.amount / total) * 100 : 0 }));
  }, [data]);

  const exportCsv = () => {
    if (!activeShopId) return;
    const q = new URLSearchParams({ period, format: 'csv' });
    if (period === 'custom' && from) q.set('from', from);
    if (period === 'custom' && to) q.set('to', to);
    apiClient.download(`/shops/${activeShopId}/analytics/sales?${q.toString()}`, 'sales-analysis.csv');
  };

  const exportPdf = () => {
    if (!activeShopId) return;
    const q = new URLSearchParams({ format: 'pdf' });
    if (period === 'custom' && from) q.set('from', from);
    if (period === 'custom' && to) q.set('to', to);
    apiClient.download(`/shops/${activeShopId}/reports/sales/export?${q.toString()}`, 'sales-report.pdf');
  };

  if (shopLoading) return <PageWrapper title={t('sales')}><SkeletonCard rows={5} /></PageWrapper>;

  const s = data?.summary;

  return (
    <PageWrapper
      title={t('sales')}
      description={t('salesOverview')}
      breadcrumb={['Owner', t('reports'), t('sales')]}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="btn-outline inline-flex items-center gap-2 text-sm"><Download size={16} /> {t('csvExport')}</button>
          <button onClick={exportPdf} className="btn-outline inline-flex items-center gap-2 text-sm"><FileText size={16} /> {t('pdfExport')}</button>
        </div>
      }
    >
      <PeriodSelector period={period} onChange={setPeriod} from={from} to={to} onFrom={setFrom} onTo={setTo} />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
          <SkeletonCard rows={6} />
        </div>
      ) : (
        <>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StaggerItem><StatsCard title={t('transactionsCount')} value={formatNumber(s?.totalTransactions ?? 0)} tone="navy" icon={<Receipt size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('revenue')} value={formatCurrency(s?.totalRevenue ?? 0)} tone="teal" icon={<TrendingUp size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('averageSale')} value={formatCurrency(s?.averageSale ?? 0)} tone="gold" /></StaggerItem>
            <StaggerItem><StatsCard title={t('itemsSold')} value={formatNumber(s?.totalItems ?? 0)} tone="navy" icon={<Package size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('totalCustomers')} value={formatNumber(s?.totalCustomers ?? 0)} tone="teal" icon={<Users size={20} />} /></StaggerItem>
          </Stagger>

          <ChartWrapper title={t('salesTrend')} subtitle={t('revenue')} className="mb-6">
            {(data?.trend ?? []).length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.trend ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            <ChartWrapper title={t('paymentMethod')} subtitle={t('byPaymentMethod')}>
              {payData.length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <div className="space-y-4">
                  {payData.map((p) => (
                    <div key={p.method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-foreground capitalize">{p.method}</span>
                        <span className="text-muted-foreground">{p.pct.toFixed(0)}% · {formatCurrency(p.amount)}</span>
                      </div>
                      <div className="h-3 bg-muted-2 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartWrapper>

            <ChartWrapper title={t('byCategory')} subtitle={t('revenue')}>
              {(data?.perCategory ?? []).length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.perCategory ?? []} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                      <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                      <Tooltip formatter={(v) => [formatCurrency(Number(v)), t('revenue')]} />
                      <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartWrapper>
          </Reveal>

          <ChartWrapper title={t('byProduct')} subtitle={t('topProducts')}>
            {(data?.perProduct ?? []).length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr>
                      <th className="px-4 py-3">{t('products')}</th>
                      <th className="px-4 py-3">{t('category')}</th>
                      <th className="px-4 py-3 text-right">{t('quantity')}</th>
                      <th className="px-4 py-3 text-right">{t('revenue')}</th>
                      <th className="px-4 py-3 text-right">{t('profit')}</th>
                      <th className="px-4 py-3 text-right">{t('margin')}</th>
                      <th className="px-4 py-3 text-right">{t('share')}</th>
                      <th className="px-4 py-3 text-right">{t('trend')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(data?.perProduct ?? []).slice(0, 20).map((p) => (
                      <tr key={p.productId} className="hover:bg-muted transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(p.quantity)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-secondary">{formatCurrency(p.revenue)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.profit)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p.margin.toFixed(0)}%</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p.share.toFixed(0)}%</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${p.trendPct >= 0 ? 'text-secondary' : 'text-danger'}`}>
                            {p.trendPct >= 0 ? <Up size={12} /> : <TrendingDown size={12} />} {Math.abs(p.trendPct).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartWrapper>
        </>
      )}
    </PageWrapper>
  );
}
