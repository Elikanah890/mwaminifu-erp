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

function monthlyFactor(cycle: string): number {
  const c = (cycle || '').toLowerCase();
  if (c.includes('year')) return 1 / 12;
  if (c.includes('week')) return 4.33;
  return 1;
}

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
        apiClient.get<Subscription[]>('/admin/subscriptions?limit=1000'),
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

  const active = useMemo(() => subscriptions.filter((s) => s.isActive), [subscriptions]);

  const filtered = useMemo(() => {
    if (statusFilter === 'active') return subscriptions.filter((s) => s.isActive);
    if (statusFilter === 'expired') return subscriptions.filter((s) => !s.isActive);
    return subscriptions;
  }, [subscriptions, statusFilter]);

  const planMap = useMemo(() => {
    const m = new Map<string, SubscriptionPlan>();
    for (const p of plans) m.set(p.name.toLowerCase(), p);
    return m;
  }, [plans]);

  const agacRevenue = useMemo(
    () =>
      active.reduce((sum, s) => {
        const plan = planMap.get((s.plan || '').toLowerCase());
        if (!plan) return sum;
        return sum + plan.price * monthlyFactor(plan.billingCycle);
      }, 0),
    [active, planMap]
  );

  const byPlan = useMemo(() => {
    const m = new Map<string, { count: number; revenue: number }>();
    for (const s of active) {
      const plan = planMap.get((s.plan || '').toLowerCase());
      const key = s.plan || 'Unknown';
      const entry = m.get(key) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += plan ? plan.price * monthlyFactor(plan.billingCycle) : 0;
      m.set(key, entry);
    }
    return Array.from(m.entries())
      .map(([plan, v]) => ({ plan, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [active, planMap]);

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
            <StaggerItem><StatsCard title="Total Subscriptions" value={formatNumber(active.length)} tone="navy" sub="active subscriptions" /></StaggerItem>
            <StaggerItem><StatsCard title="Total AGAC Revenue" value={formatCurrency(agacRevenue)} tone="teal" sub="monthly subscription revenue" /></StaggerItem>
            <StaggerItem><StatsCard title="Commissions Paid" value={formatCurrency(money?.commissionsPaid ?? 0)} tone="gold" sub="paid to agents" /></StaggerItem>
            <StaggerItem><StatsCard title="Net AGAC Income" value={formatCurrency(money?.netIncome ?? agacRevenue)} tone="navy" sub="revenue less commissions" /></StaggerItem>
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
                      <th className="py-3 px-3 text-right font-semibold">Monthly Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {byPlan.map((row) => (
                      <tr key={row.plan} className="transition-colors hover:bg-muted">
                        <td className="py-2.5 px-3 font-medium text-foreground">{row.plan}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{row.count}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-secondary">{formatCurrency(row.revenue)}</td>
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
