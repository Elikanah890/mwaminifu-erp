'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { PayablesReport } from '@/lib/types';
import { formatCurrency, formatDate, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import StatsCard from '@/components/StatsCard';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Wallet } from 'lucide-react';

export default function PayablesPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<PayablesReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    setLoading(true);
    apiClient.get<PayablesReport>(`/shops/${activeShopId}/payables`)
      .then((res) => setData(res.data ?? null))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [activeShopId]);

  if (shopLoading || loading) return <PageWrapper title={t('payables')}><SkeletonTable rows={6} /></PageWrapper>;

  return (
    <PageWrapper title={t('payables')} description={t('payables')} breadcrumb={['Owner', t('finance'), t('payables')]}>
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('payables')} value={formatCurrency(data?.totalPayable ?? 0)} tone="red" icon={<Wallet size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title={t('suppliers')} value={data?.count ?? 0} tone="navy" /></StaggerItem>
      </Stagger>

      {!data || data.items.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('supplier')}</th>
                <th className="px-4 py-3">{t('invoiceNo')}</th>
                <th className="px-4 py-3">{t('date')}</th>
                <th className="px-4 py-3">{t('dueDate')}</th>
                <th className="px-4 py-3 text-right">{t('total')}</th>
                <th className="px-4 py-3 text-right">{t('paid')}</th>
                <th className="px-4 py-3 text-right">{t('balance')}</th>
                <th className="px-4 py-3">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((p) => (
                <tr key={p.purchaseId} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 font-medium text-foreground">{p.supplier}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.invoiceNo ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(p.dueDate)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(p.total)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.amountPaid)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-danger">{formatCurrency(p.balance)}</td>
                  <td className="px-4 py-3"><Pill tone={p.status === 'PAID' ? 'green' : p.status === 'PARTIAL' ? 'amber' : 'red'}>{p.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}
    </PageWrapper>
  );
}
