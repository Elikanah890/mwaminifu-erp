'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { usePermissions } from '@/lib/context/PermissionsContext';
import { EmployeeDashboard } from '@/lib/types';
import { formatCurrency, formatNumber, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import StatsCard from '@/components/StatsCard';
import { Stagger, StaggerItem, Reveal, MotionCard, motion } from '@/components/motion';
import { ShoppingCart, Clock, Package, TrendingUp, Wallet } from 'lucide-react';

export default function EmployeeDashboardPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t, locale } = useI18n();
  const { can } = usePermissions();
  const [data, setData] = useState<EmployeeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = apiClient.getUser();

  useEffect(() => {
    if (!activeShopId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    apiClient.get<EmployeeDashboard>('/employee/dashboard')
      .then((res) => { if (!cancelled && res.data) setData(res.data); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeShopId]);

  if (shopLoading || loading) {
    return (
      <PageWrapper title={t('dashboard')} description={t('dashboard')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard rows={4} />
          <SkeletonCard rows={4} />
        </div>
      </PageWrapper>
    );
  }

  const isOpen = data?.shiftStatus === 'OPEN';
  const hour = new Date().getHours();
  const greeting = locale === 'sw'
    ? (hour < 12 ? 'Habari za asubuhi' : hour < 17 ? 'Habari za mchana' : 'Habari za jioni')
    : (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
  const firstName = user?.name?.split(' ')[0];
  const friendlyTitle = firstName ? `${greeting}, ${firstName}` : greeting;
  const friendlyDesc = locale === 'sw'
    ? 'Huu ni muhtasari wa shughuli zako leo.'
    : "Here's a quick look at your activity today.";

  return (
    <PageWrapper title={friendlyTitle} description={friendlyDesc} breadcrumb={['Employee', t('dashboard')]}>
      {error && <Reveal><div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div></Reveal>}

      <Reveal className="mb-6">
        <MotionCard
          hover={false}
          className={`surface-card relative overflow-hidden p-6 ${isOpen ? 'ring-1 ring-secondary/30' : 'ring-1 ring-warning/20'}`}
        >
          <div className={`pointer-events-none absolute inset-0 ${isOpen ? 'bg-secondary/5' : 'bg-warning/5'}`} />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <motion.span
                animate={isOpen ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={isOpen ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isOpen ? 'bg-secondary/15 text-secondary' : 'bg-warning/15 text-warning'}`}
              >
                <Clock size={26} />
              </motion.span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">{t('shiftStatus')}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-foreground">{isOpen ? t('open') : t('closed')}</h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isOpen ? 'bg-secondary/10 text-secondary' : 'bg-warning/10 text-warning'}`}>
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-secondary' : 'bg-warning'}`}
                    />
                    {isOpen ? t('open') : t('closed')}
                  </span>
                </div>
                {data?.activeShift ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('date')}: <span className="font-medium text-foreground">{formatDateTime(data.activeShift.startedAt)}</span>
                    <span className="mx-2 text-border-strong">·</span>
                    {t('openingBalance')}: <span className="font-medium text-foreground">{formatCurrency(data.activeShift.openingCashBalance)}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {locale === 'sw' ? 'Anza zamu yako ili kuanza kuuza.' : 'Open your shift to start selling.'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {can('sales:create') && (
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                  <Link href="/employee/sales" className="btn-teal inline-flex items-center gap-2"><ShoppingCart size={16} /> {t('newSale')}</Link>
                </motion.div>
              )}
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                {isOpen ? (
                  <Link href="/employee/shift" className="btn-gold inline-flex items-center gap-2"><Clock size={16} /> {t('closeShift')}</Link>
                ) : (
                  <Link href="/employee/shift" className="btn-navy inline-flex items-center gap-2"><Clock size={16} /> {t('openShift')}</Link>
                )}
              </motion.div>
            </div>
          </div>
        </MotionCard>
      </Reveal>

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('shiftStatus')} value={isOpen ? t('open') : t('closed')} tone={isOpen ? 'teal' : 'gray'} icon={<Clock size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard featured title={t('todaysSales')} value={formatCurrency(data?.todaySales ?? 0)} tone="teal" icon={<TrendingUp size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title={t('transactionsCount')} value={formatNumber(data?.transactions ?? 0)} tone="navy" icon={<ShoppingCart size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title={t('averageSale')} value={formatCurrency(data?.averageSale ?? 0)} tone="gold" sub={`${t('itemsSold')}: ${formatNumber(data?.itemsSold ?? 0)}`} icon={<Package size={20} />} /></StaggerItem>
      </Stagger>

      <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaggerItem>
          <ChartWrapper title={t('currentShift')} subtitle={t('shiftStatus')}>
            {data?.activeShift ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">{t('date')}</dt><dd className="font-medium text-foreground">{formatDateTime(data.activeShift.startedAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{t('openingBalance')}</dt><dd className="font-medium text-foreground">{formatCurrency(data.activeShift.openingCashBalance)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{t('todaysSales')}</dt><dd className="font-medium text-secondary">{formatCurrency(data?.todaySales ?? 0)}</dd></div>
                <div className="flex items-center gap-2 pt-1 text-xs text-subtle-foreground"><Wallet size={14} /> {t('currentShift')}</div>
              </dl>
            ) : (
              <EmptyState message={t('noData')} />
            )}
          </ChartWrapper>
        </StaggerItem>

        <StaggerItem>
          <ChartWrapper title={t('recentTransactions')} subtitle={t('mySales')}>
            {(data?.recentSales ?? []).length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <ul className="divide-y divide-border max-h-80 overflow-y-auto">
                {(data?.recentSales ?? []).map((s) => (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-4 rounded-lg px-2 transition-colors hover:bg-muted">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{s.receiptNumber ?? t('sales')}</p>
                      <p className="text-xs text-subtle-foreground">{formatDateTime(s.saleDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-secondary">{formatCurrency(s.grandTotal)}</p>
                      <p className="text-xs text-subtle-foreground capitalize">{s.paymentMethod ?? '-'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ChartWrapper>
        </StaggerItem>
      </Stagger>
    </PageWrapper>
  );
}
