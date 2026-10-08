'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { ReceivablesAging } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import StatsCard from '@/components/StatsCard';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Wallet } from 'lucide-react';

const bucketLabel: Record<string, string> = { '0-30': '0–30', '31-60': '31–60', '61-90': '61–90', '90+': '90+' };

export default function CreditPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<ReceivablesAging | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    setLoading(true);
    apiClient.get<ReceivablesAging>(`/shops/${activeShopId}/receivables/aging`)
      .then((res) => setData(res.data ?? null))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [activeShopId]);

  if (shopLoading || loading) return <PageWrapper title={t('receivables')}><SkeletonTable rows={6} /></PageWrapper>;

  const buckets = data?.summary.buckets ?? {};

  return (
    <PageWrapper title={t('receivables')} description={t('aging')} breadcrumb={['Owner', t('customers'), t('receivables')]}>
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('outstandingCredit')} value={formatCurrency(data?.summary.totalOutstanding ?? 0)} tone="red" icon={<Wallet size={20} />} /></StaggerItem>
        {Object.entries(bucketLabel).map(([k, label]) => (
          <StaggerItem key={k}><StatsCard title={`${label} ${t('days')}`} value={formatCurrency((buckets as Record<string, number>)[k] ?? 0)} tone="gold" /></StaggerItem>
        ))}
      </Stagger>

      {!data || data.data.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('customer')}</th>
                <th className="px-4 py-3">{t('phone')}</th>
                <th className="px-4 py-3 text-right">{t('outstandingCredit')}</th>
                <th className="px-4 py-3 text-right">{t('creditLimit')}</th>
                <th className="px-4 py-3">{t('aging')}</th>
                <th className="px-4 py-3">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.data.map((c) => (
                <tr key={c.customerId} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-danger">{formatCurrency(c.outstandingBalance)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(c.creditLimit)}</td>
                  <td className="px-4 py-3"><Pill tone={c.bucket === '90+' ? 'red' : c.bucket === '61-90' ? 'amber' : 'teal'}>{bucketLabel[c.bucket] ?? c.bucket}</Pill></td>
                  <td className="px-4 py-3">{c.isBlacklisted ? <Pill tone="red">{t('blacklisted')}</Pill> : <Pill tone="green">{t('active')}</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}
    </PageWrapper>
  );
}
