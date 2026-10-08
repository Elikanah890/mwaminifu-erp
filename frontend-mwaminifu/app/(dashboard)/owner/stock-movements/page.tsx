'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { StockMovement } from '@/lib/types';
import { formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';

const typeTone: Record<string, 'green' | 'red' | 'amber' | 'teal' | 'navy' | 'gray'> = {
  PURCHASE: 'green', SALE: 'red', ADJUSTMENT: 'amber', RETURN: 'teal', DAMAGED: 'red', OPENING: 'navy', SALE_RETURN: 'teal',
};

export default function StockMovementsPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    const q = type ? `&type=${type}` : '';
    apiClient.get<StockMovement[]>(`/shops/${activeShopId}/stock-movements?limit=200${q}`)
      .then((res) => setMovements(res.data ?? []))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load();   }, [activeShopId, type]);

  return (
    <PageWrapper
      title={t('stockMovements')}
      description={t('stockMovements')}
      breadcrumb={['Owner', t('inventory'), t('stockMovements')]}
      actions={
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field max-w-[180px]">
          <option value="">{t('all')}</option>
          {['PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGED', 'OPENING'].map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      }
    >
      {shopLoading || loading ? (
        <SkeletonTable rows={8} />
      ) : movements.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('date')}</th>
                <th className="px-4 py-3">{t('products')}</th>
                <th className="px-4 py-3">{t('type')}</th>
                <th className="px-4 py-3 text-right">{t('quantity')}</th>
                <th className="px-4 py-3 text-right">{t('balance')}</th>
                <th className="px-4 py-3">{t('reference')}</th>
                <th className="px-4 py-3">{t('reason')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{m.product?.name ?? '-'}</td>
                  <td className="px-4 py-3"><Pill tone={typeTone[m.type] ?? 'gray'}>{m.type}</Pill></td>
                  <td className={`px-4 py-3 text-right font-semibold ${m.quantity < 0 ? 'text-danger' : 'text-secondary'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{m.balanceAfter}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.reference ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.reason ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}
    </PageWrapper>
  );
}
