'use client';

import { useShop } from '@/lib/context/ShopContext';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard } from '@/components/Spinner';
import { MotionPage } from '@/components/motion';
import PosScreen from '@/components/pos/PosScreen';

export default function OwnerSalesPage() {
  const { activeShopId, loading } = useShop();

  return (
    <PageWrapper title="Sales (POS)" description="Record a sale, process payments and issue a receipt" breadcrumb={['Owner', 'Sales']}>
      {loading || !activeShopId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonCard rows={8} /></div>
          <SkeletonCard rows={8} />
        </div>
      ) : (
        <MotionPage>
          <PosScreen shopId={activeShopId} />
        </MotionPage>
      )}
    </PageWrapper>
  );
}
