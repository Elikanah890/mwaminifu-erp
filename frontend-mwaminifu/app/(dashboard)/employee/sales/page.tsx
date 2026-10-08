'use client';

import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import PosScreen from '@/components/pos/PosScreen';

export default function EmployeeSalesPage() {
  const { activeShopId, loading } = useShop();
  const { t } = useI18n();

  return (
    <PageWrapper title={t('pos')} description={t('pointOfSale')} breadcrumb={['Employee', t('sales')]}>
      {loading || !activeShopId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><SkeletonCard rows={7} /></div>
          <SkeletonCard rows={7} />
        </div>
      ) : (
        <Reveal>
          <PosScreen shopId={activeShopId} />
        </Reveal>
      )}
    </PageWrapper>
  );
}
