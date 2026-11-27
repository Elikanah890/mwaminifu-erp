'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AgentStats } from '@/lib/types';
import { formatCurrency, formatNumber, formatDate, errorMessage } from '@/lib/format';
import StatsCard from '@/components/StatsCard';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { Pill } from '@/components/StatusBadge';
import { statusLabel, paymentMethodLabel } from '@/lib/i18n/labels';
import { useI18n } from '@/lib/context/I18nContext';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';

interface CommissionRow {
  id: string;
  owner?: { id: string; name: string } | null;
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  payout?: { id: string; reference?: string | null } | null;
  payment?: { amount?: number; subscription?: { plan?: string } | null } | null;
}

interface PayoutRow {
  id: string;
  amount: number;
  method: string;
  walletNumber?: string | null;
  reference?: string | null;
  status: string;
  createdAt: string;
  completedAt?: string | null;
}

export default function AgentCommissionsPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [statsRes, commRes, payRes] = await Promise.all([
          apiClient.get<AgentStats>('/agents/dashboard'),
          apiClient.get<CommissionRow[]>('/agents/commissions?limit=200'),
          apiClient.get<PayoutRow[]>('/agents/payouts?limit=200'),
        ]);
        if (cancelled) return;
        if (statsRes.data) setStats(statsRes.data);
        if (commRes.data) setCommissions(commRes.data);
        if (payRes.data) setPayouts(payRes.data);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading)
    return (
      <PageWrapper title={t('myCommissions')}>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (<SkeletonCard key={i} rows={1} />))}
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper title={t('myCommissions')} description={t('myCommissionsDesc')} breadcrumb={[t('agentPortal'), t('myCommissions')]}>
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('totalEarned')} value={formatCurrency(stats?.commissionEarned ?? 0)} tone="navy" /></StaggerItem>
        <StaggerItem><StatsCard title={t('paid')} value={formatCurrency(stats?.commissionPaid ?? 0)} tone="teal" /></StaggerItem>
        <StaggerItem><StatsCard title={t('pending')} value={formatCurrency(stats?.commissionPending ?? 0)} tone="gold" /></StaggerItem>
        <StaggerItem><StatsCard title={t('thisMonth')} value={formatCurrency(stats?.commissionThisMonth ?? 0)} tone="green" /></StaggerItem>
        <StaggerItem><StatsCard title={t('agentCode')} value={stats?.agentCode || '—'} tone="navy" sub={`${formatNumber(stats?.totalBusinesses ?? 0)} ${t('customers').toLowerCase()}`} /></StaggerItem>
      </Stagger>

      <Reveal className="mb-6">
        <ChartWrapper title={t('commissionHistory')} subtitle={t('commissionSubtitle')}>
          {commissions.length === 0 ? (
            <EmptyState message={t('noCommissions')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-subtle-foreground">
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 font-semibold">{t('date')}</th>
                    <th className="py-3 pr-4 font-semibold">{t('customer')}</th>
                    <th className="py-3 pr-4 font-semibold">{t('plan')}</th>
                    <th className="py-3 pr-4 font-semibold text-right">{t('amount')}</th>
                    <th className="py-3 pr-4 font-semibold">{t('status')}</th>
                    <th className="py-3 font-semibold">{t('payoutRef')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                      <td className="py-3 pr-4 font-medium text-foreground">{c.owner?.name ?? '—'}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{c.payment?.subscription?.plan ?? '—'}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-secondary">{formatCurrency(c.amount)}</td>
                      <td className="py-3 pr-4"><Pill tone={c.status === 'PAID' ? 'green' : c.status === 'PENDING' ? 'amber' : 'gray'}>{statusLabel(t, c.status)}</Pill></td>
                      <td className="py-3 font-mono text-xs text-muted-foreground">{c.payout?.reference ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartWrapper>
      </Reveal>

      <Reveal>
        <ChartWrapper title={t('payoutHistory')} subtitle={t('payoutSubtitle')}>
          {payouts.length === 0 ? (
            <EmptyState message={t('noPayouts')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-subtle-foreground">
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 font-semibold">{t('date')}</th>
                    <th className="py-3 pr-4 font-semibold">{t('reference')}</th>
                    <th className="py-3 pr-4 font-semibold">{t('method')}</th>
                    <th className="py-3 pr-4 font-semibold text-right">{t('amount')}</th>
                    <th className="py-3 font-semibold">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">{formatDate(p.completedAt || p.createdAt)}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-foreground">{p.reference ?? '—'}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{paymentMethodLabel(t, p.method)}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-secondary">{formatCurrency(p.amount)}</td>
                      <td className="py-3"><Pill tone={p.status === 'COMPLETED' ? 'green' : 'amber'}>{statusLabel(t, p.status)}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartWrapper>
      </Reveal>
    </PageWrapper>
  );
}
