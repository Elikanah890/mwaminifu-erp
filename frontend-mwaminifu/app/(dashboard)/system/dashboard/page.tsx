'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiClient } from '@/lib/api/client';
import { AdminDashboard, RevenueGranularity } from '@/lib/types';
import { formatCurrency, formatNumber, errorMessage } from '@/lib/format';
import { useI18n } from '@/lib/context/I18nContext';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import { Users, Building2, UserCog, Wallet, CreditCard, TrendingUp, Coins, HandCoins } from 'lucide-react';

const GRANULARITIES: RevenueGranularity[] = ['daily', 'weekly', 'monthly', 'yearly'];

export default function SystemDashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [granularity, setGranularity] = useState<RevenueGranularity>('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get<AdminDashboard>(`/admin/dashboard?granularity=${granularity}`);
        if (!cancelled && res.data) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [granularity]);

  if (loading && !data) {
    return (
      <PageWrapper title={t('dashboard')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} rows={1} />
          ))}
        </div>
      </PageWrapper>
    );
  }

  const platform = data?.platform;
  const money = data?.money;
  const health = data?.health;
  const breakdown = data?.breakdown;
  const action = data?.actionRequired;
  const trend = data?.revenueTrend?.points ?? [];

  return (
    <PageWrapper
      title={t('dashboard')}
      description={t('platformSize')}
      breadcrumb={[t('dashboard')]}
    >
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Row 1 — Platform size */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('businessOwners')} value={formatNumber(platform?.totalBusinessOwners ?? 0)} tone="navy" icon={<Users size={20} />} href="/system/businesses" /></StaggerItem>
        <StaggerItem><StatsCard title={t('totalShops')} value={formatNumber(platform?.totalShops ?? 0)} tone="teal" icon={<Building2 size={20} />} href="/system/businesses" /></StaggerItem>
        <StaggerItem><StatsCard title={t('agents')} value={formatNumber(platform?.totalAgents ?? 0)} tone="navy" icon={<UserCog size={20} />} href="/system/agents" sub={platform && platform.deactivatedAgents > 0 ? `${platform.deactivatedAgents} ${t('deactivatedAgents')}` : undefined} /></StaggerItem>
        <StaggerItem><StatsCard title={t('activeSubscriptions')} value={formatNumber(platform?.activeSubscriptions ?? 0)} tone="gold" icon={<CreditCard size={20} />} href="/system/subscriptions" /></StaggerItem>
      </Stagger>

      {/* Row 2 — Money (subscriptions only) */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('totalAgacRevenue')} value={formatCurrency(money?.totalRevenue ?? 0)} tone="teal" icon={<Wallet size={20} />} href="/system/subscriptions" /></StaggerItem>
        <StaggerItem><StatsCard title={t('revenueThisMonth')} value={formatCurrency(money?.monthlyRevenue ?? 0)} tone="navy" icon={<TrendingUp size={20} />} href="/system/subscriptions" /></StaggerItem>
        <StaggerItem><StatsCard title={t('commissionsPaid')} value={formatCurrency(money?.commissionsPaid ?? 0)} tone="gold" icon={<HandCoins size={20} />} href="/system/agents" /></StaggerItem>
        <StaggerItem><StatsCard title={t('netAgacIncome')} value={formatCurrency(money?.netIncome ?? 0)} tone="green" icon={<Coins size={20} />} href="/system/subscriptions" /></StaggerItem>
      </Stagger>

      {/* Row 3 — Revenue trend */}
      <Reveal className="mb-6">
        <ChartWrapper
          title={t('revenueTrend')}
          subtitle={`${t('totalAgacRevenue')} · ${t(granularity === 'daily' ? 'dailyBilling' : granularity === 'weekly' ? 'weeklyBilling' : granularity === 'monthly' ? 'monthlyBilling' : 'yearlyBilling')}`}
          action={
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
              {GRANULARITIES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${granularity === g ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted-2'}`}
                >
                  {t(`${g}Billing`)}
                </button>
              ))}
            </div>
          }
        >
          {trend.length === 0 ? (
            <EmptyState message={t('noData')} />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="subRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00897B" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#00897B" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-subtle-foreground" />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-subtle-foreground" width={64} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                  <Area type="monotone" dataKey="revenue" stroke="#00897B" strokeWidth={2} fill="url(#subRevenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartWrapper>
      </Reveal>

      {/* Row 4 — Action required + breakdown */}
      <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartWrapper title={t('actionRequired')} subtitle={t('subscriptions')}>
          <ul className="divide-y divide-border">
            <ActionRow href="/system/subscriptions" label={t('expiringSoon')} value={action?.expiringSoon ?? 0} tone="amber" />
            <ActionRow href="/system/subscriptions" label={t('gracePeriodShops')} value={action?.gracePeriod ?? 0} tone="amber" />
            <ActionRow href="/system/agents" label={t('pendingPayouts')} value={formatCurrency(action?.pendingPayouts ?? 0)} tone="navy" />
            <ActionRow href="/system/subscriptions" label={t('failedPayments')} value={action?.failedPayments ?? 0} tone="red" />
          </ul>
        </ChartWrapper>

        <ChartWrapper title={t('subscriptionBreakdown')} subtitle={t('subscriptions')}>
          <div className="grid grid-cols-2 gap-4">
            <BreakdownItem label={t('basicPlan')} value={breakdown?.basic ?? 0} tone="text-primary" />
            <BreakdownItem label={t('premiumPlan')} value={breakdown?.premium ?? 0} tone="text-secondary" />
            <BreakdownItem label={t('monthlyBilling')} value={breakdown?.monthly ?? 0} tone="text-foreground" />
            <BreakdownItem label={t('yearlyBilling')} value={breakdown?.yearly ?? 0} tone="text-foreground" />
            <BreakdownItem label={t('dailyBilling')} value={breakdown?.daily ?? 0} tone="text-foreground" />
            <BreakdownItem label={t('weeklyBilling')} value={breakdown?.weekly ?? 0} tone="text-foreground" />
          </div>
        </ChartWrapper>
      </Reveal>

      {/* Row 5 — Subscription health */}
      <Reveal className="mb-6">
        <ChartWrapper title={t('subscriptionHealth')} subtitle={`${t('churnRate')}: ${health?.churnRate ?? 0}%`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <HealthStat label={t('active')} value={health?.active ?? 0} total={health?.total ?? 0} tone="text-secondary" />
            <HealthStat label={t('grace')} value={health?.grace ?? 0} total={health?.total ?? 0} tone="text-[#9a7b1f] dark:text-[#E3C25A]" />
            <HealthStat label={t('lapsed')} value={health?.lapsed ?? 0} total={health?.total ?? 0} tone="text-danger" />
          </div>
        </ChartWrapper>
      </Reveal>

      {/* Row 6 — Recent activity (business events) */}
      <Reveal>
        <ChartWrapper title={t('recentActivity')} subtitle={t('businesses')}>
          {(data?.recentActivity?.length ?? 0) === 0 ? (
            <EmptyState message={t('noData')} />
          ) : (
            <ul className="divide-y divide-border">
              {data!.recentActivity.map((item) => (
                <li key={item.id} className="py-3 flex items-center justify-between gap-4 transition-colors hover:bg-muted -mx-2 px-2 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-subtle-foreground truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-xs text-subtle-foreground shrink-0">{new Date(item.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>
      </Reveal>
    </PageWrapper>
  );
}

function ActionRow({ href, label, value, tone }: { href: string; label: string; value: number | string; tone: 'amber' | 'navy' | 'red' }) {
  const toneCls = tone === 'red' ? 'text-danger' : tone === 'amber' ? 'text-[#9a7b1f] dark:text-[#E3C25A]' : 'text-primary';
  return (
    <li>
      <Link href={href} className="py-3 flex items-center justify-between gap-3 -mx-2 px-2 rounded-lg transition-colors hover:bg-muted">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-semibold ${toneCls}`}>{typeof value === 'number' ? formatNumber(value) : value}</span>
      </Link>
    </li>
  );
}

function BreakdownItem({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-subtle-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{formatNumber(value)}</p>
    </div>
  );
}

function HealthStat({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <p className={`text-3xl font-bold ${tone}`}>{formatNumber(value)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label} · {pct}%</p>
    </div>
  );
}
