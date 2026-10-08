'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AgentStats } from '@/lib/types';
import { formatNumber, errorMessage } from '@/lib/format';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';

export default function AgentCommissionsPage() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get<AgentStats>('/agents/dashboard');
        if (res.data) setStats(res.data);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading)
    return (
      <PageWrapper title="My Commissions">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} rows={1} />
          ))}
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper title="My Commissions" description="Track your earnings" breadcrumb={['Agent', 'Commissions']}>
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StaggerItem><StatsCard title="Customers Registered" value={formatNumber(stats?.totalBusinesses ?? 0)} tone="navy" /></StaggerItem>
        <StaggerItem><StatsCard title="New This Month" value={formatNumber(stats?.businessesThisMonth ?? 0)} tone="teal" /></StaggerItem>
        <StaggerItem><StatsCard title="Commission Earned" value="—" tone="gold" sub="Awaiting commission engine" /></StaggerItem>
      </Stagger>

      <Reveal>
        <ChartWrapper title="Commission Breakdown" subtitle="Per-customer commission history">
          <p className="text-sm text-subtle-foreground">
            Commission amounts, payment status (paid/pending) and payout history will appear here once the commission
            engine is enabled for your account.
          </p>
        </ChartWrapper>
      </Reveal>
    </PageWrapper>
  );
}
