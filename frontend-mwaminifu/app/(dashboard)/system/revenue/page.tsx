'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Subscription, SubscriptionPlan, AdminDashboard } from '@/lib/types';
import { formatCurrency, formatNumber, formatDate, errorMessage } from '@/lib/format';
import { useI18n } from '@/lib/context/I18nContext';
import { statusLabel, billingCycleLabel } from '@/lib/i18n/labels';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal, motion } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';

export default function RevenuePage() {
  const { t } = useI18n();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [money, setMoney] = useState<AdminDashboard['money'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('filter') === 'active') setStatusFilter('active');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [subsRes, plansRes, dashRes] = await Promise.all([
        apiClient.get<Subscription[]>('/admin/subscriptions?limit=200'),
        apiClient.get<SubscriptionPlan[]>('/admin/subscriptions/plans'),
        apiClient.get<AdminDashboard>('/admin/dashboard?granularity=monthly'),
      ]);
      if (subsRes.data) setSubscriptions(subsRes.data);
      if (plansRes.data) setPlans(plansRes.data);
      if (dashRes.data?.money) setMoney(dashRes.data.money);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => subscriptions.filter((s) => s.status === 'ACTIVE' && !s.shop?.isArchived), [subscriptions]);

  const filtered = useMemo(() => {
    if (statusFilter === 'active') return subscriptions.filter((s) => s.status === 'ACTIVE');
    if (statusFilter === 'expired') return subscriptions.filter((s) => s.status !== 'ACTIVE');
    return subscriptions;
  }, [subscriptions, statusFilter]);

  const byPlan = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of active) {
      const key = s.plan || 'Unknown';
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count);
  }, [active]);

  return (
    <PageWrapper title={t('platformRevenue')} description={t('revenueDesc')} breadcrumb={[t('systemOwner'), t('revenue')]}>
      <Reveal className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <p className="text-sm text-muted-foreground">{t('revenueNote')}</p>
        <motion.button
          onClick={load}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="btn-outline text-sm px-3 py-1.5"
        >
          {t('refresh')}
        </motion.button>
      </Reveal>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} rows={1} />
          ))}
        </div>
      ) : (
        <>
          <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StaggerItem><StatsCard title={t('activeSubscriptions')} value={formatNumber(active.length)} tone="navy" sub={t('activeShopsOnly')} /></StaggerItem>
            <StaggerItem><StatsCard title={t('totalSubscriptionRevenue')} value={formatCurrency(money?.totalRevenue ?? 0)} tone="teal" sub={t('fromPayments')} /></StaggerItem>
            <StaggerItem><StatsCard title={t('mrr')} value={formatCurrency(money?.monthlyRevenue ?? 0)} tone="gold" sub={t('paymentsThisMonth')} /></StaggerItem>
            <StaggerItem><StatsCard title={t('netPlatformIncome')} value={formatCurrency(money?.netIncome ?? 0)} tone="navy" sub={`${t('after')} ${formatCurrency(money?.commissionsPaid ?? 0)} ${t('commissions').toLowerCase()}`} /></StaggerItem>
          </Stagger>

          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartWrapper title={t('subscriptionsByPlan')} subtitle={t('byPlanSubtitle')}>
              {byPlan.length === 0 ? (
                <EmptyState message={t('noActiveSubscriptions')} />
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr className="border-b border-border">
                      <th className="py-3 px-3 font-semibold">{t('plan')}</th>
                      <th className="py-3 px-3 font-semibold">{t('subscriptions')}</th>
                      <th className="py-3 px-3 text-right font-semibold">{t('share')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {byPlan.map((row) => (
                      <tr key={row.plan} className="transition-colors hover:bg-muted">
                        <td className="py-2.5 px-3 font-medium text-foreground">{row.plan}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{row.count}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-secondary">
                          {active.length ? `${Math.round((row.count / active.length) * 100)}%` : '0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </ChartWrapper>

            <ChartWrapper title={t('planPricing')} subtitle={t('planPricingSubtitle')}>
              {plans.length === 0 ? (
                <EmptyState message={t('noPlansConfigured')} />
              ) : (
                <ul className="divide-y divide-border">
                  {plans.map((p) => (
                    <li key={p.id} className="py-3 flex items-center justify-between gap-3 transition-colors hover:bg-muted -mx-2 px-2 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-subtle-foreground capitalize">{billingCycleLabel(t, p.billingCycle)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">{formatCurrency(p.price)}</p>
                        <Pill tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? t('active') : t('inactive')}</Pill>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ChartWrapper>
          </Reveal>

          <Reveal>
          <ChartWrapper
            title={t('subscriptions')}
            subtitle={t('subscriptionsSubtitle')}
            action={
              <select className="input-field max-w-[140px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">{t('all')}</option>
                <option value="active">{t('active')}</option>
                <option value="expired">{t('expired')}</option>
              </select>
            }
          >
            {filtered.length === 0 ? (
              <EmptyState message={t('noSubscriptions')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr className="border-b border-border">
                      <th className="py-3 px-3 font-semibold">{t('shop')}</th>
                      <th className="py-3 px-3 font-semibold">{t('owner')}</th>
                      <th className="py-3 px-3 font-semibold">{t('plan')}</th>
                      <th className="py-3 px-3 font-semibold">{t('start')}</th>
                      <th className="py-3 px-3 font-semibold">{t('end')}</th>
                      <th className="py-3 px-3 font-semibold">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((s) => (
                      <tr key={s.id} className="transition-colors hover:bg-muted">
                        <td className="py-2.5 px-3 font-medium text-foreground">{s.shop?.name ?? '-'}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{s.shop?.owner?.name ?? '-'}</td>
                        <td className="py-2.5 px-3"><Pill tone="navy">{s.plan}</Pill></td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">{formatDate(s.startDate)}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">{s.endDate ? formatDate(s.endDate) : '-'}</td>
                        <td className="py-2.5 px-3"><Pill tone={s.isActive ? 'green' : 'gray'}>{statusLabel(t, s.status)}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartWrapper>
          </Reveal>
        </>
      )}
    </PageWrapper>
  );
}
