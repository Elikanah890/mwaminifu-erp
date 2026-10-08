'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { InventoryAnalytics } from '@/lib/types';
import { formatCurrency, formatNumber, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import StatsCard from '@/components/StatsCard';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Boxes, Package, AlertTriangle, PackageX, TrendingUp, Download, FileText } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function InventoryReportPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<InventoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get<InventoryAnalytics>(`/shops/${activeShopId}/analytics/inventory`)
      .then((res) => { if (!cancelled) setData(res.data ?? null); })
      .catch((err) => { if (!cancelled) toast(errorMessage(err), 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeShopId]);

  const exportCsv = () => {
    if (!activeShopId) return;
    apiClient.download(`/shops/${activeShopId}/analytics/inventory?format=csv`, 'inventory-analysis.csv');
  };

  const exportPdf = () => {
    if (!activeShopId) return;
    apiClient.download(`/shops/${activeShopId}/reports/inventory/export?format=pdf`, 'inventory-report.pdf');
  };

  if (shopLoading) return <PageWrapper title={t('inventory')}><SkeletonCard rows={5} /></PageWrapper>;

  const s = data?.summary;

  return (
    <PageWrapper title={t('inventory')} description={t('inventoryOverview')} breadcrumb={['Owner', t('reports'), t('inventory')]}>
      <div className="flex justify-end gap-2 mb-6">
        <button onClick={exportCsv} className="btn-outline inline-flex items-center gap-2 text-sm"><Download size={16} /> {t('csvExport')}</button>
        <button onClick={exportPdf} className="btn-outline inline-flex items-center gap-2 text-sm"><FileText size={16} /> {t('pdfExport')}</button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard rows={5} />
            <SkeletonCard rows={5} />
          </div>
        </div>
      ) : (
        <>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <StaggerItem><StatsCard title={t('products')} value={formatNumber(s?.totalProducts ?? 0)} tone="navy" icon={<Package size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('items')} value={formatNumber(s?.totalItems ?? 0)} tone="navy" icon={<Boxes size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('valuation')} value={formatCurrency(s?.totalValue ?? 0)} tone="teal" icon={<TrendingUp size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('sellingPrice')} value={formatCurrency(s?.totalRetailValue ?? 0)} tone="gold" /></StaggerItem>
            <StaggerItem><StatsCard title={t('lowStock')} value={formatNumber(s?.lowStockCount ?? 0)} tone="gold" icon={<AlertTriangle size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('outOfStock')} value={formatNumber(s?.outOfStockCount ?? 0)} tone="red" icon={<PackageX size={20} />} /></StaggerItem>
          </Stagger>

          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartWrapper title={t('byCategory')} subtitle={t('valuation')}>
              {(data?.byCategory ?? []).length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.byCategory ?? []} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                      <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                      <Tooltip formatter={(v) => [formatCurrency(Number(v)), t('valuation')]} />
                      <Bar dataKey="value" fill="var(--secondary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartWrapper>

            <ChartWrapper title={t('byCategory')} subtitle={t('items')}>
              {(data?.byCategory ?? []).length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                  {(data?.byCategory ?? []).map((c) => (
                    <li key={c.category} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.category}</p>
                        <p className="text-xs text-subtle-foreground">{c.products} {t('products')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-secondary">{formatCurrency(c.value)}</p>
                        <p className="text-xs text-subtle-foreground">{formatNumber(c.items)} {t('items')}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ChartWrapper>
          </Reveal>

          <ChartWrapper title={t('byProduct')} subtitle={t('stock')}>
            {(data?.perProduct ?? []).length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr>
                      <th className="px-4 py-3">{t('products')}</th>
                      <th className="px-4 py-3">{t('category')}</th>
                      <th className="px-4 py-3 text-right">{t('stock')}</th>
                      <th className="px-4 py-3 text-right">{t('costPrice')}</th>
                      <th className="px-4 py-3 text-right">{t('valuation')}</th>
                      <th className="px-4 py-3 text-right">{t('reorderLevel')}</th>
                      <th className="px-4 py-3">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(data?.perProduct ?? []).map((p) => (
                      <tr key={p.productId} className="hover:bg-muted transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatNumber(p.stock)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.costPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-secondary">{formatCurrency(p.value)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{p.reorderLevel}</td>
                        <td className="px-4 py-3">
                          {p.status === 'OUT' ? <Pill tone="red">{t('outOfStock')}</Pill> : p.status === 'LOW' ? <Pill tone="amber">{t('lowStock')}</Pill> : <Pill tone="green">{t('inStock')}</Pill>}
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
