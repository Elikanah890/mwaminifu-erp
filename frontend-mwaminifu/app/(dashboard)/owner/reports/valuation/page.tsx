'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { ValuationAnalytics } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import StatsCard from '@/components/StatsCard';
import { useToast } from '@/components/Toast';
import { Boxes, Banknote, HandCoins, Landmark, Wallet, Calculator, Download, FileText } from 'lucide-react';

export default function ValuationReportPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<ValuationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get<ValuationAnalytics>(`/shops/${activeShopId}/analytics/valuation`)
      .then((res) => { if (!cancelled) setData(res.data ?? null); })
      .catch((err) => { if (!cancelled) toast(errorMessage(err), 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeShopId]);

  if (shopLoading) return <PageWrapper title={t('valuation')}><SkeletonCard rows={5} /></PageWrapper>;

  const s = data?.summary;
  const maxAsset = Math.max(...(data?.assets.map((a) => a.amount) ?? [0]), 1);
  const maxLiability = Math.max(...(data?.liabilities.map((l) => l.amount) ?? [0]), 1);

  const exportCsv = () => {
    if (!activeShopId) return;
    apiClient.download(`/shops/${activeShopId}/reports/valuation/export?format=csv`, 'valuation.csv');
  };

  const exportPdf = () => {
    if (!activeShopId) return;
    apiClient.download(`/shops/${activeShopId}/reports/valuation/export?format=pdf`, 'valuation.pdf');
  };

  return (
    <PageWrapper
      title={t('valuation')}
      description={t('valuationOverview')}
      breadcrumb={['Owner', t('reports'), t('valuation')]}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="btn-outline inline-flex items-center gap-2 text-sm"><Download size={16} /> {t('csvExport')}</button>
          <button onClick={exportPdf} className="btn-outline inline-flex items-center gap-2 text-sm"><FileText size={16} /> {t('pdfExport')}</button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
          <SkeletonCard rows={3} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard rows={4} />
            <SkeletonCard rows={4} />
          </div>
        </div>
      ) : (
        <>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StaggerItem><StatsCard title={t('stockValue')} value={formatCurrency(s?.stockValue ?? 0)} tone="teal" icon={<Boxes size={20} />} sub={`(+) ${t('assets')}`} /></StaggerItem>
            <StaggerItem><StatsCard title={t('closingBalance')} value={formatCurrency(s?.cashBalance ?? 0)} tone="teal" icon={<Banknote size={20} />} sub={`(+) ${t('assets')}`} /></StaggerItem>
            <StaggerItem><StatsCard title={t('receivables')} value={formatCurrency(s?.creditReceivable ?? 0)} tone="gold" icon={<HandCoins size={20} />} sub={`(+) ${t('assets')}`} /></StaggerItem>
            <StaggerItem><StatsCard title={t('loans')} value={formatCurrency(s?.loansOutstanding ?? 0)} tone="red" icon={<Landmark size={20} />} sub={`(−) ${t('liabilities')}`} /></StaggerItem>
            <StaggerItem><StatsCard title={t('payables')} value={formatCurrency(s?.supplierPayables ?? 0)} tone="red" icon={<Wallet size={20} />} sub={`(−) ${t('liabilities')}`} /></StaggerItem>
          </Stagger>

          <Reveal>
          <div className="bg-primary rounded-xl p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-primary-foreground/70">{t('financialPosition')}</p>
              <p className="text-3xl font-bold text-accent">{formatCurrency(s?.net ?? 0)}</p>
              <p className="text-xs text-primary-foreground/60 mt-1">
                {t('assets')}: {formatCurrency(s?.totalAssets ?? 0)} · {t('liabilities')}: {formatCurrency(s?.totalLiabilities ?? 0)}
              </p>
            </div>
            <Calculator size={40} className="text-primary-foreground/40" />
          </div>
          </Reveal>

          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartWrapper title={t('assets')} subtitle={t('assets')}>
              <div className="space-y-5">
                {(data?.assets ?? []).map((a) => (
                  <div key={a.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{a.label}</span>
                      <span className="text-secondary font-semibold">{formatCurrency(a.amount)}</span>
                    </div>
                    <div className="h-3 bg-muted-2 rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${(a.amount / maxAsset) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </ChartWrapper>

            <ChartWrapper title={t('liabilities')} subtitle={t('liabilities')}>
              <div className="space-y-5">
                {(data?.liabilities ?? []).map((l) => (
                  <div key={l.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{l.label}</span>
                      <span className="text-danger font-semibold">{formatCurrency(l.amount)}</span>
                    </div>
                    <div className="h-3 bg-muted-2 rounded-full overflow-hidden">
                      <div className="h-full bg-danger rounded-full" style={{ width: `${(l.amount / maxLiability) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </ChartWrapper>
          </Reveal>
        </>
      )}
    </PageWrapper>
  );
}
