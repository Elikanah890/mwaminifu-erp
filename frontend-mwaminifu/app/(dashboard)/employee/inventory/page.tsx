'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Product } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import StatusBadge from '@/components/StatusBadge';
import { Search, Lock } from 'lucide-react';

export default function EmployeeInventoryPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeShopId) return;
    const timer = setTimeout(() => {
      setLoading(true);
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      apiClient.get<Product[]>(`/shops/${activeShopId}/products?limit=200${q}`)
        .then((res) => setProducts(res.data ?? []))
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [activeShopId, search]);

  return (
    <PageWrapper title={t('stockLookup')} description={t('inventory')} breadcrumb={['Employee', t('inventory')]}>
      <Reveal className="mb-4">
        <div className="surface-card p-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Lock size={16} className="text-secondary" />
            {t('inventory')} — {t('view')}
          </div>
        </div>
      </Reveal>

      <Reveal className="mb-6">
        <div className="surface-card p-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t('search')}...`} className="input-field pl-9" />
          </div>
        </div>
      </Reveal>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {shopLoading || loading ? (
        <SkeletonTable rows={6} />
      ) : products.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal>
          <div className="surface-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('products')}</th>
                  <th className="px-4 py-3 font-semibold">{t('category')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('sellingPrice')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('stock')}</th>
                  <th className="px-4 py-3 font-semibold">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-subtle-foreground">{p.sku ?? '-'} · {p.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{p.stockQuantity}</td>
                    <td className="px-4 py-3"><StatusBadge active={p.stockQuantity > p.reorderLevel} activeLabel={t('inStock')} inactiveLabel={t('lowStock')} /></td>
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
