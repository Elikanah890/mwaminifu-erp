'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { ProfitAnalytics, ReportPeriod } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import StatsCard from '@/components/StatsCard';
import PeriodSelector from '@/components/PeriodSelector';
import { useToast } from '@/components/Toast';
import { TrendingUp, Boxes, Receipt, Download, FileText } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';

export default function ProfitReportPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<ProfitAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams({ period });
    if (period === 'custom' && from) q.set('from', from);
    if (period === 'custom' && to) q.set('to', to);
    apiClient.get<ProfitAnalytics>(`/shops/${activeShopId}/analytics/profit?${q.toString()}`)
      .then((res) => { if (!cancelled) setData(res.data ?? null); })
      .catch((err) => { if (!cancelled) toast(errorMessage(err), 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeShopId, period, from, to]);

  const exportCsv = () => {
    if (!activeShopId) return;
    const q = new URLSearchParams({ period, format: 'csv' });
    if (period === 'custom' && from) q.set('from', from);
    if (period === 'custom' && to) q.set('to', to);
    apiClient.download(`/shops/${activeShopId}/analytics/profit?${q.toString()}`, 'profit-analysis.csv');
  };

  const exportPdf = () => {
    if (!activeShopId) return;
    const q = new URLSearchParams({ format: 'pdf' });
    if (period === 'custom' && from) q.set('from', from);
    if (period === 'custom' && to) q.set('to', to);
    apiClient.download(`/shops/${activeShopId}/reports/profit/export?${q.toString()}`, 'profit-report.pdf');
  };

  if (shopLoading) return <PageWrapper title={t('profit')}><SkeletonCard rows={5} /></PageWrapper>;

  const s = data?.summary;

  return (
    <PageWrapper
      title={t('profit')}
      description={t('profitOverview')}
      breadcrumb={['Owner', t('reports'), t('profit')]}
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
            <StaggerItem><StatsCard title={t('revenue')} value={formatCurrency(s?.totalRevenue ?? 0)} tone="teal" icon={<TrendingUp size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('cogs')} value={formatCurrency(s?.cogs ?? 0)} tone="navy" icon={<Boxes size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('grossProfit')} value={formatCurrency(s?.grossProfit ?? 0)} tone="teal" sub={`${(s?.grossMargin ?? 0).toFixed(0)}%`} /></StaggerItem>
            <StaggerItem><StatsCard title={t('expenses')} value={formatCurrency(s?.totalExpenses ?? 0)} tone="red" icon={<Receipt size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('netProfit')} value={formatCurrency(s?.netProfit ?? 0)} tone={((s?.netProfit ?? 0) >= 0) ? 'gold' : 'red'} icon={<TrendingUp size={20} />} sub={`${(s?.netMargin ?? 0).toFixed(0)}%`} /></StaggerItem>
          </Stagger>

          <ChartWrapper title={t('trend')} subtitle={t('revenue')} className="mb-6">
            {(data?.trend ?? []).length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <div className="h-64">
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
            <ChartWrapper title={t('profit')} subtitle={t('byCategory')}>
              {(data?.perCategory ?? []).length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.perCategory ?? []} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                      <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                      <Tooltip formatter={(v) => [formatCurrency(Number(v)), t('profit')]} />
                      <Bar dataKey="profit" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartWrapper>

            <ChartWrapper title={t('expenses')} subtitle={t('byCategory')}>
              {(data?.expensesByCategory ?? []).length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                  {(data?.expensesByCategory ?? []).map((e) => (
                    <li key={e.category} className="py-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground capitalize">{e.category}</span>
                      <span className="text-sm text-danger font-medium">{formatCurrency(e.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartWrapper>
          </Reveal>

          <ChartWrapper title={t('byProduct')} subtitle={t('profit')}>
            {(data?.perProduct ?? []).length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr>
                      <th className="px-4 py-3">{t('products')}</th>
                      <th className="px-4 py-3 text-right">{t('quantity')}</th>
                      <th className="px-4 py-3 text-right">{t('revenue')}</th>
                      <th className="px-4 py-3 text-right">{t('cogs')}</th>
                      <th className="px-4 py-3 text-right">{t('profit')}</th>
                      <th className="px-4 py-3 text-right">{t('margin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(data?.perProduct ?? []).slice(0, 20).map((p) => (
                      <tr key={p.productId} className="hover:bg-muted transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p.quantity}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.revenue)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.cogs)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-secondary">{formatCurrency(p.profit)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p.margin.toFixed(0)}%</td>
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
