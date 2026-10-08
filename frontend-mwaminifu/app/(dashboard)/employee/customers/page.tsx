'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Customer } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { Search } from 'lucide-react';

export default function EmployeeCustomersPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeShopId) return;
    const timer = setTimeout(() => {
      setLoading(true);
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      apiClient.get<Customer[]>(`/shops/${activeShopId}/customers?limit=200${q}`)
        .then((res) => setCustomers(res.data ?? []))
        .catch((err) => toast(errorMessage(err), 'error'))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, search]);

  return (
    <PageWrapper title={t('customers')} description={t('customers')} breadcrumb={['Employee', t('customers')]}>
      <Reveal className="mb-6">
        <div className="surface-card p-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className="input-field pl-9" />
          </div>
        </div>
      </Reveal>

      {shopLoading || loading ? (
        <SkeletonTable rows={6} />
      ) : customers.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal>
          <div className="surface-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('name')}</th>
                  <th className="px-4 py-3 font-semibold">{t('phone')}</th>
                  <th className="px-4 py-3 font-semibold">{t('email')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('outstandingCredit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(c.outstandingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </PageWrapper>
  );
}
