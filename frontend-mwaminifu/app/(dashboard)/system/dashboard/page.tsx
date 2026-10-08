'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { PlatformStats, Subscription, ActivityLog } from '@/lib/types';
import { formatNumber, formatDateTime, errorMessage } from '@/lib/format';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import { Users, Building2, Wallet, UserCog, CreditCard } from 'lucide-react';

export default function SystemDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [statsRes, subsRes, logsRes] = await Promise.all([
          apiClient.get<PlatformStats>('/admin/platform-stats'),
          apiClient.get<Subscription[]>('/admin/subscriptions?limit=1000'),
          apiClient.get<ActivityLog[]>('/admin/activity-logs?limit=8'),
        ]);
        if (cancelled) return;
        if (statsRes.data) setStats(statsRes.data);
        if (subsRes.data) setSubscriptions(subsRes.data);
        if (logsRes.data) setLogs(logsRes.data);
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
  }, []);

  const activeCount = subscriptions.filter((s) => s.isActive).length;

  const expiring = useMemo(() => {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return subscriptions.filter(
      (s) => s.isActive && s.endDate && new Date(s.endDate) <= in3Days && new Date(s.endDate) >= now
    );
  }, [subscriptions]);

  const lapsed = useMemo(
    () => subscriptions.filter((s) => !s.isActive || (s.endDate && new Date(s.endDate) < new Date())),
    [subscriptions]
  );

  if (loading)
    return (
      <PageWrapper title="Dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} rows={1} />
          ))}
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper title="Platform Overview" description="Monitor platform performance and key metrics" breadcrumb={['System', 'Dashboard']}>
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StaggerItem><StatsCard featured title="Business Owners" value={formatNumber(stats?.totalBusinesses ?? 0)} tone="navy" icon={<Users size={20} />} href="/system/businesses" /></StaggerItem>
        <StaggerItem><StatsCard title="Total Shops" value={formatNumber(stats?.totalShops ?? 0)} tone="teal" icon={<Building2 size={20} />} href="/system/businesses?tab=shops" /></StaggerItem>
        <StaggerItem><StatsCard title="Agents" value={formatNumber(stats?.totalAgents ?? 0)} tone="navy" icon={<UserCog size={20} />} href="/system/agents" /></StaggerItem>
        <StaggerItem><StatsCard title="Employees" value={formatNumber(stats?.totalEmployees ?? 0)} tone="teal" icon={<Users size={20} />} href="/system/businesses?tab=employees" /></StaggerItem>
        <StaggerItem><StatsCard title="Total Subscriptions" value={formatNumber(subscriptions.length)} tone="navy" icon={<CreditCard size={20} />} href="/system/revenue" /></StaggerItem>
        <StaggerItem><StatsCard title="Active Subscriptions" value={formatNumber(activeCount)} tone="gold" icon={<Wallet size={20} />} href="/system/revenue?filter=active" /></StaggerItem>
      </Stagger>

      <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartWrapper title="Alerts" subtitle="Subscriptions expiring within 3 days">
          {expiring.length === 0 ? (
            <EmptyState message="No subscriptions expiring soon" />
          ) : (
            <ul className="divide-y divide-border max-h-72 overflow-y-auto">
              {expiring.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3 transition-colors hover:bg-muted -mx-2 px-2 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.shop?.name ?? 'Unknown shop'}</p>
                    <p className="text-xs text-subtle-foreground">Expires {s.endDate ? new Date(s.endDate).toLocaleDateString() : '-'}</p>
                  </div>
                  <Pill tone="amber">Expiring</Pill>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>

        <ChartWrapper title="Subscription Health" subtitle="Active vs lapsed shops">
          <div className="flex items-center justify-around py-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary">{formatNumber(activeCount)}</p>
              <p className="text-sm text-muted-foreground mt-1">Active</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-danger">{formatNumber(lapsed.length)}</p>
              <p className="text-sm text-muted-foreground mt-1">Lapsed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{formatNumber(subscriptions.length)}</p>
              <p className="text-sm text-muted-foreground mt-1">Total</p>
            </div>
          </div>
        </ChartWrapper>
      </Reveal>

      <Reveal>
      <ChartWrapper title="Recent Activity" subtitle="Latest platform actions">
        {logs.length === 0 ? (
          <EmptyState message="No activity yet" />
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="py-3 flex items-center justify-between gap-4 transition-colors hover:bg-muted -mx-2 px-2 rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-subtle-foreground truncate">
                    {log.user?.name || 'System'} {log.shop ? `· ${log.shop.name}` : ''}
                  </p>
                </div>
                <span className="text-xs text-subtle-foreground shrink-0">{formatDateTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </ChartWrapper>
      </Reveal>
    </PageWrapper>
  );
}
