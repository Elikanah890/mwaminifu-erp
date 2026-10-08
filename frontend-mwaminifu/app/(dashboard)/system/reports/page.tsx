'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { PlatformStats, ActivityLog, Subscription } from '@/lib/types';
import { formatNumber, formatDateTime, errorMessage } from '@/lib/format';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal, motion } from '@/components/motion';
import { Users, Building2, UserCog, CreditCard } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface AgentsReport {
  summary: { totalAgents: number; totalOnboarded: number };
  data: Array<{
    agentId: string; username: string; name: string; isActive: boolean;
    onboarded: number; activeOwners: number; shops: number; createdAt: string;
  }>;
}

interface OwnersReport {
  summary: { totalOwners: number; activeOwners: number };
  data: Array<{
    ownerId: string; name: string; isActive: boolean; createdAt: string;
  }>;
}

type Preset = 'today' | 'week' | 'month' | 'year' | 'custom';

const PRESETS: Array<{ key: Preset; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = end;
  if (p === 'today') start = new Date(end);
  else if (p === 'week') start = new Date(end.getTime() - 6 * 86400000);
  else if (p === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (p === 'year') start = new Date(now.getFullYear(), 0, 1);
  return { from: fmt(start), to: fmt(end) };
}

export default function ReportsPage() {
  const [agents, setAgents] = useState<AgentsReport | null>(null);
  const [owners, setOwners] = useState<OwnersReport | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [preset, setPreset] = useState<Preset>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [agentsRes, ownersRes, statsRes, logsRes, subsRes] = await Promise.all([
        apiClient.get<AgentsReport>('/admin/reports/agents'),
        apiClient.get<OwnersReport>('/admin/reports/owners'),
        apiClient.get<PlatformStats>('/admin/platform-stats'),
        apiClient.get<ActivityLog[]>('/admin/activity-logs?limit=8'),
        apiClient.get<Subscription[]>('/admin/subscriptions?limit=1000'),
      ]);
      if (agentsRes.data) setAgents(agentsRes.data);
      if (ownersRes.data) setOwners(ownersRes.data);
      if (statsRes.data) setStats(statsRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      if (subsRes.data) setSubscriptions(subsRes.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'custom') return;
    const r = presetRange(p);
    setFrom(r.from);
    setTo(r.to);
  };

  const growth = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of owners?.data ?? []) {
      const key = (o.createdAt || '').slice(0, 7);
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([k, v]) => ({ label: k, count: v }));
  }, [owners]);

  const activeSubs = subscriptions.filter((s) => s.isActive).length;
  const lapsedSubs = subscriptions.length - activeSubs;
  const subPie = [
    { name: 'Active', value: activeSubs, color: '#00897b' },
    { name: 'Lapsed', value: lapsedSubs, color: '#EF4444' },
  ];

  const newBusinesses = useMemo(() => {
    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;
    return (owners?.data ?? []).filter((o) => {
      const c = new Date(o.createdAt);
      if (start && c < start) return false;
      if (end) {
        const e = new Date(end);
        e.setHours(23, 59, 59, 999);
        if (c > e) return false;
      }
      return true;
    }).length;
  }, [owners, from, to]);

  const activeAgents = (agents?.data ?? []).filter((a) => a.isActive).length;

  return (
    <PageWrapper title="Platform Reports" description="Business growth, subscriptions and agent performance" breadcrumb={['System', 'Reports']}>
      <Reveal className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <motion.button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                preset === p.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {p.label}
            </motion.button>
          ))}
          <input type="date" className="input-field w-[150px]" value={from} onChange={(e) => { setPreset('custom'); setFrom(e.target.value); }} />
          <input type="date" className="input-field w-[150px]" value={to} onChange={(e) => { setPreset('custom'); setTo(e.target.value); }} />
        </div>
        <motion.button
          onClick={() => window.print()}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="btn-navy text-sm px-3 py-2"
        >
          PDF / Print
        </motion.button>
      </Reveal>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} rows={1} />
          ))}
        </div>
      ) : (
        <>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StaggerItem><StatsCard title="New Businesses" value={formatNumber(newBusinesses)} tone="navy" icon={<Users size={20} />} sub="in selected period" /></StaggerItem>
            <StaggerItem><StatsCard title="Total Shops" value={formatNumber(stats?.totalShops ?? 0)} tone="teal" icon={<Building2 size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title="Active Agents" value={formatNumber(activeAgents)} tone="navy" icon={<UserCog size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title="Total Subscriptions" value={formatNumber(subscriptions.length)} tone="gold" icon={<CreditCard size={20} />} /></StaggerItem>
          </Stagger>

          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartWrapper title="Business Growth" subtitle="New businesses per month (last 12 months)">
              {growth.length === 0 ? (
                <EmptyState message="No businesses yet" />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                      <Tooltip formatter={(value) => [Number(value), 'Businesses']} />
                      <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartWrapper>

            <ChartWrapper title="Subscription Health" subtitle="Active vs lapsed subscriptions">
              {subscriptions.length === 0 ? (
                <EmptyState message="No subscriptions" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={subPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {subPie.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [Number(value), 'Shops']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex items-center justify-center gap-6 text-sm">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-secondary" /> Active ({activeSubs})</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-danger" /> Lapsed ({lapsedSubs})</span>
              </div>
            </ChartWrapper>
          </Reveal>

          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartWrapper title="Recent Activities" subtitle="Latest platform actions">
              {logs.length === 0 ? (
                <EmptyState message="No activity yet" />
              ) : (
                <ul className="divide-y divide-border max-h-80 overflow-y-auto">
                  {logs.map((log) => (
                    <li key={log.id} className="py-3 flex items-center justify-between gap-4 transition-colors hover:bg-muted -mx-2 px-2 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-subtle-foreground truncate">{log.user?.name || 'System'} {log.shop ? `· ${log.shop.name}` : ''}</p>
                      </div>
                      <span className="text-xs text-subtle-foreground shrink-0">{formatDateTime(log.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartWrapper>

            <ChartWrapper title="Agent Performance" subtitle="Owners onboarded per agent">
              {(agents?.data ?? []).length === 0 ? (
                <EmptyState message="No agents" />
              ) : (
                <ul className="divide-y divide-border max-h-80 overflow-y-auto">
                  {(agents?.data ?? []).map((a) => (
                    <li key={a.agentId} className="py-3 flex items-center justify-between gap-4 transition-colors hover:bg-muted -mx-2 px-2 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{a.name} <span className="text-xs text-subtle-foreground">@{a.username}</span></p>
                        <p className="text-xs text-subtle-foreground">{a.shops} shops · {a.activeOwners} active owners</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">{formatNumber(a.onboarded)}</p>
                        <p className="text-xs text-subtle-foreground">onboarded</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ChartWrapper>
          </Reveal>
        </>
      )}
    </PageWrapper>
  );
}
