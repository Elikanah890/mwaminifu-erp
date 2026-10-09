'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { AgentStats, AgentProfile, AgentBusiness } from '@/lib/types';
import { formatNumber, formatCurrency, formatDate, errorMessage } from '@/lib/format';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal, motion } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import { UserPlus, Users, Store, HandCoins } from 'lucide-react';

export default function AgentDashboardPage() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [recent, setRecent] = useState<AgentBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [statsRes, profileRes, recentRes] = await Promise.all([
          apiClient.get<AgentStats>('/agents/dashboard'),
          apiClient.get<AgentProfile>('/agents/me'),
          apiClient.get<AgentBusiness[]>('/agents/businesses?limit=5'),
        ]);
        if (cancelled) return;
        if (statsRes.data) setStats(statsRes.data);
        if (profileRes.data) setProfile(profileRes.data);
        if (recentRes.data) setRecent(recentRes.data);
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

  if (loading)
    return (
      <PageWrapper title="Dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} rows={1} />
          ))}
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper title="Dashboard" description={`Welcome back, ${profile?.name ?? 'Agent'}`} breadcrumb={['Agent', 'Dashboard']}>
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard featured title="Total Customers" value={formatNumber(stats?.totalBusinesses ?? 0)} tone="navy" icon={<Users size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title="Active Customers" value={formatNumber(stats?.activeBusinesses ?? 0)} tone="teal" sub={`${stats?.inactiveBusinesses ?? 0} inactive`} /></StaggerItem>
        <StaggerItem><StatsCard title="New This Month" value={formatNumber(stats?.businessesThisMonth ?? 0)} tone="teal" /></StaggerItem>
        <StaggerItem><StatsCard title="Total Shops" value={formatNumber(stats?.totalShops ?? 0)} tone="navy" icon={<Store size={20} />} /></StaggerItem>
      </Stagger>

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard title="Commission Earned" value={formatCurrency(stats?.commissionEarned ?? 0)} tone="gold" icon={<HandCoins size={20} />} sub={stats?.agentCode || undefined} /></StaggerItem>
        <StaggerItem><StatsCard title="Paid" value={formatCurrency(stats?.commissionPaid ?? 0)} tone="teal" /></StaggerItem>
        <StaggerItem><StatsCard title="Pending" value={formatCurrency(stats?.commissionPending ?? 0)} tone="gold" /></StaggerItem>
        <StaggerItem><StatsCard title="This Month" value={formatCurrency(stats?.commissionThisMonth ?? 0)} tone="green" /></StaggerItem>
      </Stagger>

      <Reveal className="flex flex-wrap gap-3 mb-6">
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <Link href="/agent/register" className="btn-gold inline-flex items-center gap-2">
            <UserPlus size={16} /> Register New Business
          </Link>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <Link href="/agent/customers" className="btn-outline inline-flex items-center gap-2">
            <Users size={16} /> View My Customers
          </Link>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <Link href="/agent/commissions" className="btn-outline inline-flex items-center gap-2">
            <HandCoins size={16} /> View Commissions
          </Link>
        </motion.div>
      </Reveal>

      <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartWrapper title="Agent Profile" subtitle="Your account details">
          {profile ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Name</dt><dd className="font-medium text-foreground">{profile.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Agent Code</dt><dd className="font-mono text-primary">AGAC-{profile.username}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium text-foreground">{profile.phone || '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd className="font-medium text-foreground">{profile.email || '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Businesses</dt><dd className="font-medium text-foreground">{formatNumber(profile.stats?.onboardedBusinesses ?? 0)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Shops</dt><dd className="font-medium text-foreground">{formatNumber(profile.stats?.totalShops ?? 0)}</dd></div>
            </dl>
          ) : (
            <EmptyState message="Profile unavailable" />
          )}
        </ChartWrapper>

        <ChartWrapper title="Recent Registrations" subtitle="Your latest onboarded customers">
          {recent.length === 0 ? (
            <EmptyState message="No businesses registered yet" />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((b) => (
                <li key={b.id} className="py-3 flex items-center justify-between gap-4 transition-colors hover:bg-muted -mx-2 px-2 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{b.name}</p>
                    <p className="text-xs text-subtle-foreground">{b.ownedShops?.[0]?.address || b.ownedShops?.[0]?.name || '—'}</p>
                  </div>
                  <div className="text-right">
                    <Pill tone={!b.isActive ? 'gray' : b.isPinSet ? 'green' : 'amber'}>
                      {!b.isActive ? 'Inactive' : b.isPinSet ? 'Active' : 'Pending'}
                    </Pill>
                    <p className="text-xs text-subtle-foreground mt-1">{formatDate(b.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartWrapper>
      </Reveal>
    </PageWrapper>
  );
}
