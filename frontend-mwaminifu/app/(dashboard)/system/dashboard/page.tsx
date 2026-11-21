'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiClient } from '@/lib/api/client';
import { AdminDashboard, PlatformStats, RevenueGranularity } from '@/lib/types';
import { formatCurrency, formatNumber, errorMessage } from '@/lib/format';
import { useI18n } from '@/lib/context/I18nContext';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  CreditCard,
  HandCoins,
  Headphones,
  LifeBuoy,
  Plus,
  Server,
  UserCog,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

const GRANULARITIES: RevenueGranularity[] = ['daily', 'weekly', 'monthly', 'yearly'];

type SessionSummary = { count: number; max: number };
type SettingsSummary = { settings?: Record<string, unknown> };

export default function SystemDashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [sessions, setSessions] = useState<SessionSummary | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [granularity, setGranularity] = useState<RevenueGranularity>('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [dashRes, statsRes, sessionsRes, settingsRes] = await Promise.all([
          apiClient.get<AdminDashboard>(`/admin/dashboard?granularity=${granularity}`),
          apiClient.get<PlatformStats>('/admin/platform-stats'),
          apiClient.get<SessionSummary>('/admin/sessions'),
          apiClient.get<SettingsSummary>('/admin/settings'),
        ]);
        if (cancelled) return;
        if (dashRes.data) setData(dashRes.data);
        if (statsRes.data) setStats(statsRes.data);
        if (sessionsRes.data) setSessions(sessionsRes.data);
        if (settingsRes.data?.settings) setSettings(settingsRes.data.settings);
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
      <PageWrapper title={t('dashboard')} description={t('platformOverview')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} rows={1} />
          ))}
        </div>
      </PageWrapper>
    );
  }

  const platform = data?.platform;
  const money = data?.money;
  const health = data?.health;
  const action = data?.actionRequired;
  const trend = data?.revenueTrend?.points ?? [];

  const activeBusinessOwners = stats?.activeBusinessOwners ?? platform?.activeBusinessOwners ?? 0;
  const activeShops = stats?.totalShops ?? platform?.totalShops ?? 0;
  const activeAgents = stats?.activeAgents ?? platform?.activeAgents ?? 0;
  const activeSubscriptions = stats?.activeSubscriptions ?? platform?.activeSubscriptions ?? 0;

  const pendingTickets = stats?.pendingTickets ?? 0;
  const failedPayments = action?.failedPayments ?? 0;
  const expiringSoon = action?.expiringSoon ?? 0;
  const graceLapsed = `${health?.grace ?? 0} / ${health?.lapsed ?? 0}`;
  const pendingPaymentShops = action?.pendingPaymentShops ?? health?.pendingPayment ?? 0;
  const maintenanceOn = settings.maintenanceMode === true;
  const sessionCount = sessions?.count ?? 0;
  const sessionMax = sessions?.max ?? 2;

  return (
    <PageWrapper
      title={t('dashboard')}
      description={t('platformOverview')}
      breadcrumb={[t('dashboard')]}
    >
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Row 1 — Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatsCard title={t('activeBusinessOwners')} value={formatNumber(activeBusinessOwners)} tone="navy" icon={<Users size={20} />} href="/system/businesses" />
        <StatsCard title={t('activeShops')} value={formatNumber(activeShops)} tone="teal" icon={<Building2 size={20} />} href="/system/businesses" />
        <StatsCard title={t('activeAgents')} value={formatNumber(activeAgents)} tone="green" icon={<UserCog size={20} />} href="/system/agents" />
        <StatsCard title={t('activeSubscriptions')} value={formatNumber(activeSubscriptions)} tone="gold" icon={<CreditCard size={20} />} href="/system/subscriptions" />
      </div>

      {/* Row 2 — Revenue (same SubscriptionPayment source everywhere) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatsCard title={t('totalSubscriptionRevenue')} value={formatCurrency(money?.totalRevenue ?? 0)} tone="teal" icon={<Wallet size={20} />} href="/system/revenue" sub={t('fromPayments')} />
        <StatsCard title={t('mrr')} value={formatCurrency(money?.monthlyRevenue ?? 0)} tone="navy" icon={<Activity size={20} />} href="/system/revenue" />
        <StatsCard title={t('commissionsPaid')} value={formatCurrency(money?.commissionsPaid ?? 0)} tone="gold" icon={<HandCoins size={20} />} href="/system/agents" />
        <StatsCard title={t('netPlatformIncome')} value={formatCurrency(money?.netIncome ?? 0)} tone="green" icon={<BarChart3 size={20} />} href="/system/revenue" />
      </div>

      {/* Row 3 — Operations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
        <StatsCard title={t('pendingSupportTickets')} value={formatNumber(pendingTickets)} tone={pendingTickets > 0 ? 'red' : 'gray'} icon={<Headphones size={20} />} href="/system/support" />
        <StatsCard title={t('failedPayments')} value={formatNumber(failedPayments)} tone={failedPayments > 0 ? 'red' : 'gray'} icon={<AlertTriangle size={20} />} href="/system/subscriptions" />
        <StatsCard title={t('expiringSubscriptions')} value={formatNumber(expiringSoon)} tone={expiringSoon > 0 ? 'gold' : 'gray'} icon={<CalendarClock size={20} />} href="/system/subscriptions" />
        <StatsCard title={t('pendingPaymentShops')} value={formatNumber(pendingPaymentShops)} tone={pendingPaymentShops > 0 ? 'gold' : 'gray'} icon={<CreditCard size={20} />} href="/system/subscriptions" />
        <StatsCard title={t('graceLapsedShops')} value={graceLapsed} tone="navy" icon={<Server size={20} />} href="/system/subscriptions" sub={`${t('grace')} / ${t('lapsed')}`} />
      </div>

      {/* Row 4 — Growth & Health */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <div className="xl:col-span-2">
          <ChartWrapper
            title={t('revenueTrend')}
            subtitle={`${t('totalSubscriptionRevenue')} · ${t(granularity === 'daily' ? 'dailyBilling' : granularity === 'weekly' ? 'weeklyBilling' : granularity === 'monthly' ? 'monthlyBilling' : 'yearlyBilling')}`}
            action={
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted p-1">
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
              <EmptyState message={t('noPaymentsThisMonth')} />
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-4">
          <InfoCard
            icon={<Activity size={18} />}
            label={t('churnRate')}
            value={`${health?.churnRate ?? 0}%`}
            tone="text-danger"
            sub={`${health?.lapsed ?? 0} ${t('lapsed')} / ${health?.total ?? 0}`}
          />
          <InfoCard
            icon={<ShieldIcon />}
            label={t('activeSessions')}
            value={`${sessionCount} / ${sessionMax}`}
            tone="text-primary"
            sub={sessionCount > sessionMax ? t('sessionLimitExceeded') : t('concurrentSessions')}
          />
          <InfoCard
            icon={<Wrench size={18} />}
            label={t('maintenanceMode')}
            value={maintenanceOn ? t('on') : t('off')}
            tone={maintenanceOn ? 'text-danger' : 'text-success'}
            sub={maintenanceOn ? t('maintenanceOn') : t('maintenanceOff')}
          />
        </div>
      </div>

      {/* Row 5 — Quick actions & recent activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="surface-card self-start p-5">
          <h2 className="text-base font-semibold text-foreground">{t('quickActions')}</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction href="/system/agents?create=1" icon={<Plus size={16} />} label={t('createAgent')} />
            <QuickAction href="/system/businesses?create=1" icon={<Building2 size={16} />} label={t('createBusiness')} />
            <QuickAction href="/system/reports" icon={<BarChart3 size={16} />} label={t('reports')} />
            <QuickAction href="/system/support" icon={<LifeBuoy size={16} />} label={t('support')} />
          </div>
        </div>

        <div className="xl:col-span-2">
          <ChartWrapper title={t('recentActivity')} subtitle={t('platformOverview')}>
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
        </div>
      </div>
    </PageWrapper>
  );
}

function ShieldIcon() {
  return <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-current text-[10px] font-bold">S</span>;
}

function InfoCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted-2 text-primary">{icon}</span>
      </div>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-subtle-foreground">{sub}</p>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      {label}
    </Link>
  );
}
