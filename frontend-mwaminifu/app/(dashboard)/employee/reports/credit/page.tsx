'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { usePermissions } from '@/lib/context/PermissionsContext';
import { CreditReport } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import AccessDenied from '@/components/AccessDenied';
import { SkeletonCard, SkeletonTable, EmptyState } from '@/components/Spinner';
import StatsCard from '@/components/StatsCard';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { Wallet, Users } from 'lucide-react';

export default function EmployeeCreditReportPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { can, loading: permsLoading } = usePermissions();
  const { toast } = useToast();
  const [data, setData] = useState<CreditReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId || !can('reports:credit')) return;
    setLoading(true);
    apiClient.get<CreditReport>(`/shops/${activeShopId}/reports/credit`)
      .then((res) => setData(res.data ?? null))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, can]);

  if (permsLoading) return <PageWrapper title={t('creditReport')}><SkeletonTable rows={6} /></PageWrapper>;
  if (!can('reports:credit')) return <PageWrapper title={t('creditReport')}><AccessDenied /></PageWrapper>;
  if (shopLoading || loading) return <PageWrapper title={t('creditReport')}><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><SkeletonCard rows={1} /><SkeletonCard rows={1} /></div></PageWrapper>;

  return (
    <PageWrapper title={t('creditReport')} description={t('creditReportDesc')} breadcrumb={[t('employeePortal'), t('reports'), t('creditReport')]}>
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('outstandingCredit')} value={formatCurrency(data?.summary.totalOutstanding ?? 0)} tone="red" icon={<Wallet size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title={t('customersWithDebt')} value={String(data?.summary.customersWithDebt ?? 0)} tone="gold" icon={<Users size={20} />} /></StaggerItem>
      </Stagger>
      <Reveal><div className="surface-card overflow-x-auto">
        {(data?.data ?? []).length === 0 ? (
          <div className="p-4"><EmptyState message={t('noData')} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('customer')}</th>
                <th className="px-4 py-3">{t('phone')}</th>
                <th className="px-4 py-3 text-right">{t('outstandingCredit')}</th>
                <th className="px-4 py-3 text-right">{t('creditLimit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.data ?? []).map((customer) => (
                <tr key={customer.id} className="hover:bg-muted transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{customer.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{customer.phone ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-danger">{formatCurrency(customer.outstandingBalance)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(customer.creditLimit ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div></Reveal>
    </PageWrapper>
  );
}
