'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import PosScreen from '@/components/pos/PosScreen';
import { usePermissions } from '@/lib/context/PermissionsContext';
import AccessDenied from '@/components/AccessDenied';

export default function EmployeeSalesPage() {
  const { activeShopId, loading } = useShop();
  const { t } = useI18n();
  const { can, loading: permsLoading } = usePermissions();
  const tracksShift = can('shift:view') || can('shift:open') || can('shift:close');
  // Spec 8.8.1 — a cashier cannot sell before opening their shift.
  const [shiftChecked, setShiftChecked] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(true);

  useEffect(() => {
    if (!can('sales:create') || !tracksShift) {
      setShiftOpen(true);
      setShiftChecked(true);
      return;
    }
    let cancelled = false;
    apiClient
      .get<unknown>('/shifts/active')
      .then((res) => {
        if (!cancelled) setShiftOpen(Boolean(res.data));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setShiftChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [can, tracksShift]);

  if (permsLoading) {
    return <PageWrapper title={t('pos')}><SkeletonCard rows={7} /></PageWrapper>;
  }
  if (!can('sales:create')) {
    return <PageWrapper title={t('pos')}><AccessDenied /></PageWrapper>;
  }

  return (
    <PageWrapper title={t('pos')} description={t('pointOfSale')} breadcrumb={[t('employeePortal'), t('sales')]}>
      {loading || !activeShopId || !shiftChecked ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><SkeletonCard rows={7} /></div>
          <SkeletonCard rows={7} />
        </div>
      ) : !shiftOpen ? (
        <Reveal>
          <div className="surface-card mx-auto max-w-lg p-8 text-center">
            <h2 className="text-lg font-semibold text-foreground">{t('openShiftFirst')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('openingCashDesc')}
            </p>
            <Link href="/employee/shift" className="btn-navy mt-5 inline-block">
              {t('openShift')}
            </Link>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <PosScreen shopId={activeShopId} />
        </Reveal>
      )}
    </PageWrapper>
  );
}
