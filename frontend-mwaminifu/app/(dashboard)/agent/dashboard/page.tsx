'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
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
  const { t } = useI18n();
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
      <PageWrapper title={t('dashboard')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} rows={1} />
          ))}
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper title={t('dashboard')} description={`${t('welcomeBack')}, ${profile?.name ?? t('agentPortal')}`} breadcrumb={[t('agentPortal'), t('dashboard')]}>
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard featured title={t('totalCustomers')} value={formatNumber(stats?.totalCustomers ?? stats?.totalShops ?? 0)} tone="navy" icon={<Users size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title={t('activeCustomers')} value={formatNumber(stats?.activeBusinesses ?? 0)} tone="teal" sub={`${stats?.pendingBusinesses ?? 0} ${t('pendingPayment')}`} /></StaggerItem>
        <StaggerItem><StatsCard title={t('newThisMonth')} value={formatNumber(stats?.businessesThisMonth ?? 0)} tone="teal" /></StaggerItem>
        <StaggerItem><StatsCard title={t('totalShops')} value={formatNumber(stats?.totalShops ?? 0)} tone="navy" icon={<Store size={20} />} /></StaggerItem>
      </Stagger>

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('commissionEarned')} value={formatCurrency(stats?.commissionEarned ?? 0)} tone="gold" icon={<HandCoins size={20} />} sub={stats?.agentCode || undefined} /></StaggerItem>
        <StaggerItem><StatsCard title={t('paid')} value={formatCurrency(stats?.commissionPaid ?? 0)} tone="teal" /></StaggerItem>
        <StaggerItem><StatsCard title={t('pending')} value={formatCurrency(stats?.commissionPending ?? 0)} tone="gold" /></StaggerItem>
        <StaggerItem><StatsCard title={t('thisMonth')} value={formatCurrency(stats?.commissionThisMonth ?? 0)} tone="green" /></StaggerItem>
      </Stagger>

      <Reveal className="flex flex-wrap gap-3 mb-6">
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <Link href="/agent/register" className="btn-gold inline-flex items-center gap-2">
            <UserPlus size={16} /> {t('registerNewBusiness')}
          </Link>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <Link href="/agent/customers" className="btn-outline inline-flex items-center gap-2">
            <Users size={16} /> {t('viewMyCustomers')}
          </Link>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <Link href="/agent/commissions" className="btn-outline inline-flex items-center gap-2">
            <HandCoins size={16} /> {t('viewCommissions')}
          </Link>
        </motion.div>
      </Reveal>

      <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartWrapper title={t('agentProfile')} subtitle={t('agentProfileSubtitle')}>
          {profile ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('name')}</dt><dd className="font-medium text-foreground">{profile.name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('agentCode')}</dt><dd className="font-mono text-primary">AGAC-{profile.username}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('phone')}</dt><dd className="font-medium text-foreground">{profile.phone || '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('email')}</dt><dd className="font-medium text-foreground">{profile.email || '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('businesses')}</dt><dd className="font-medium text-foreground">{formatNumber(profile.stats?.onboardedBusinesses ?? 0)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('shops')}</dt><dd className="font-medium text-foreground">{formatNumber(profile.stats?.totalShops ?? 0)}</dd></div>
            </dl>
          ) : (
            <EmptyState message={t('profileUnavailable')} />
          )}
        </ChartWrapper>

        <ChartWrapper title={t('recentRegistrations')} subtitle={t('latestOnboardedCustomers')}>
          {recent.length === 0 ? (
            <EmptyState message={t('noBusinessesRegistered')} />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((b) => (
                <li key={b.id} className="py-3 flex items-center justify-between gap-4 transition-colors hover:bg-muted -mx-2 px-2 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{b.name}</p>
                    <p className="text-xs text-subtle-foreground">{b.ownedShops?.[0]?.address || b.ownedShops?.[0]?.name || '—'}</p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const status = !b.isActive
                        ? { label: t('inactive'), tone: 'gray' as const }
                        : b.billingStatus === 'ACTIVE'
                          ? { label: t('active'), tone: 'green' as const }
                          : b.billingStatus === 'LAPSED'
                            ? { label: t('lapsed'), tone: 'red' as const }
                            : { label: t('pendingPayment'), tone: 'amber' as const };
                      return <Pill tone={status.tone}>{status.label}</Pill>;
                    })()}
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
