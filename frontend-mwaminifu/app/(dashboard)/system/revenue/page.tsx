'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Subscription, SubscriptionPlan, AdminDashboard } from '@/lib/types';
import { formatCurrency, formatNumber, formatDate, errorMessage } from '@/lib/format';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal, motion } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';

export default function RevenuePage() {
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
    <PageWrapper title="Platform Revenue" description="AGAC revenue from shop subscriptions" breadcrumb={['System', 'Revenue']}>
      <Reveal className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <p className="text-sm text-muted-foreground">Subscription revenue only — shop sales are excluded from platform revenue.</p>
        <motion.button
          onClick={load}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="btn-outline text-sm px-3 py-1.5"
        >
          Refresh
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
            <StaggerItem><StatsCard title="Active Subscriptions" value={formatNumber(active.length)} tone="navy" sub="active shops only" /></StaggerItem>
            <StaggerItem><StatsCard title="Total Subscription Revenue" value={formatCurrency(money?.totalRevenue ?? 0)} tone="teal" sub="from payments received" /></StaggerItem>
            <StaggerItem><StatsCard title="MRR (This Month)" value={formatCurrency(money?.monthlyRevenue ?? 0)} tone="gold" sub="payments this month" /></StaggerItem>
            <StaggerItem><StatsCard title="Net Platform Income" value={formatCurrency(money?.netIncome ?? 0)} tone="navy" sub={`after ${formatCurrency(money?.commissionsPaid ?? 0)} commissions`} /></StaggerItem>
          </Stagger>

          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartWrapper title="Subscriptions by Plan" subtitle="Active subscriptions grouped by plan">
              {byPlan.length === 0 ? (
                <EmptyState message="No active subscriptions" />
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr className="border-b border-border">
                      <th className="py-3 px-3 font-semibold">Plan</th>
                      <th className="py-3 px-3 font-semibold">Subscriptions</th>
                      <th className="py-3 px-3 text-right font-semibold">Share</th>
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

            <ChartWrapper title="Plan Pricing" subtitle="Configured subscription plans">
              {plans.length === 0 ? (
                <EmptyState message="No plans configured" />
              ) : (
                <ul className="divide-y divide-border">
                  {plans.map((p) => (
                    <li key={p.id} className="py-3 flex items-center justify-between gap-3 transition-colors hover:bg-muted -mx-2 px-2 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-subtle-foreground capitalize">{p.billingCycle || 'month'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">{formatCurrency(p.price)}</p>
                        <Pill tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Pill>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ChartWrapper>
          </Reveal>

          <Reveal>
          <ChartWrapper
            title="Subscriptions"
            subtitle="Shops subscribed to the platform"
            action={
              <select className="input-field max-w-[140px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            }
          >
            {filtered.length === 0 ? (
              <EmptyState message="No subscriptions" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr className="border-b border-border">
                      <th className="py-3 px-3 font-semibold">Shop</th>
                      <th className="py-3 px-3 font-semibold">Owner</th>
                      <th className="py-3 px-3 font-semibold">Plan</th>
                      <th className="py-3 px-3 font-semibold">Start</th>
                      <th className="py-3 px-3 font-semibold">End</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
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
                        <td className="py-2.5 px-3"><Pill tone={s.isActive ? 'green' : 'gray'}>{s.status}</Pill></td>
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
