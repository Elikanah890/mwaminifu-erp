'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { CustomerProfile } from '@/lib/types';
import { formatCurrency, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import StatsCard from '@/components/StatsCard';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { ArrowLeft, HandCoins, Share2 } from 'lucide-react';

const ledgerTypeLabel: Record<string, string> = {
  CHARGE: 'Charge',
  REPAYMENT: 'Repayment',
  WRITE_OFF: 'Write-off',
  ADJUSTMENT: 'Adjustment',
};

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const id = typeof params.id === 'string' ? params.id : '';
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    apiClient.get<CustomerProfile>(`/customers/${id}/profile`)
      .then((res) => setProfile(res.data ?? null))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load();   }, [id]);

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/customers/${profile.id}/credit-payment`, { amount: Number(payAmount), method: 'cash' });
      toast(t('recordPayment'), 'success');
      setPayOpen(false);
      setPayAmount('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const shareStatement = () => {
    if (!profile) return;
    const lines = (profile.recentPayments ?? []).map((p) => `${formatDateTime(p.paymentDate)} — ${formatCurrency(p.amount)}`).join('\n');
    const text = `*${t('statement')}: ${profile.name}*\n${t('outstandingCredit')}: ${formatCurrency(profile.outstandingBalance)}\n${t('creditLimit')}: ${formatCurrency(profile.creditLimit)}\n\n${lines || t('noData')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const fs = profile?.financialSummary;

  return (
    <PageWrapper
      title={t('customerProfile')}
      description={profile?.name ?? ''}
      breadcrumb={['Owner', t('customers'), t('customerProfile')]}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/owner/customers')} className="btn-outline inline-flex items-center gap-2 text-sm"><ArrowLeft size={16} /> {t('back')}</button>
          {profile && (profile.outstandingBalance > 0) && (
            <button onClick={() => { setPayAmount(''); setPayOpen(true); }} className="btn-navy inline-flex items-center gap-2"><HandCoins size={16} /> {t('recordPayment')}</button>
          )}
          {profile && (
            <button onClick={shareStatement} className="btn-teal inline-flex items-center gap-2"><Share2 size={16} /> {t('sendReminder')}</button>
          )}
        </div>
      }
    >
      {loading ? (
        <div className="space-y-6">
          <SkeletonCard rows={4} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={1} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard rows={5} />
            <SkeletonCard rows={5} />
          </div>
        </div>
      ) : !profile ? (
        <div className="surface-card"><EmptyState message={t('noData')} /></div>
      ) : (
        <div className="space-y-6">
          <Reveal><div className="surface-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-primary">{profile.name}</h2>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {profile.phone && <p>{t('phone')}: {profile.phone}</p>}
                  {profile.email && <p>{t('email')}: {profile.email}</p>}
                  {profile.address && <p>{t('address')}: {profile.address}</p>}
                  {profile.notes && <p>{t('notes')}: {profile.notes}</p>}
                </div>
              </div>
              {profile.isBlacklisted ? <Pill tone="red">{t('blacklisted')}</Pill> : profile.outstandingBalance > 0 ? <Pill tone="amber">{t('credit')}</Pill> : <Pill tone="green">{t('active')}</Pill>}
            </div>
          </div></Reveal>

          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StaggerItem><StatsCard title={t('totalPurchases')} value={formatCurrency(fs?.totalPurchases ?? 0)} tone="navy" /></StaggerItem>
            <StaggerItem><StatsCard title={t('totalPaid')} value={formatCurrency(fs?.totalPaid ?? 0)} tone="teal" /></StaggerItem>
            <StaggerItem><StatsCard title={t('outstandingCredit')} value={formatCurrency(fs?.outstandingBalance ?? 0)} tone="red" /></StaggerItem>
            <StaggerItem><StatsCard title={t('creditLimit')} value={formatCurrency(fs?.creditLimit ?? 0)} tone="gold" /></StaggerItem>
          </Stagger>

          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="surface-card overflow-x-auto">
              <div className="px-4 py-3 border-b border-border font-semibold text-foreground">{t('recentPurchases')}</div>
              {(profile.recentSales ?? []).length === 0 ? (
                <div className="p-4"><EmptyState message={t('noData')} /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr>
                      <th className="px-4 py-3">{t('receipt')}</th>
                      <th className="px-4 py-3">{t('date')}</th>
                      <th className="px-4 py-3 text-right">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {profile.recentSales.map((s) => (
                      <tr key={s.id} className="hover:bg-muted transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{s.receiptNumber ?? '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(s.saleDate)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(s.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="surface-card overflow-x-auto">
              <div className="px-4 py-3 border-b border-border font-semibold text-foreground">{t('creditHistory')}</div>
              {(profile.ledger ?? []).length === 0 ? (
                <div className="p-4"><EmptyState message={t('noData')} /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                    <tr>
                      <th className="px-4 py-3">{t('date')}</th>
                      <th className="px-4 py-3">{t('type')}</th>
                      <th className="px-4 py-3 text-right">{t('amount')}</th>
                      <th className="px-4 py-3 text-right">{t('balance')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {profile.ledger.map((l) => (
                      <tr key={l.id} className="hover:bg-muted transition-colors">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                        <td className="px-4 py-3"><Pill tone={l.type === 'CHARGE' ? 'amber' : 'green'}>{ledgerTypeLabel[l.type] ?? l.type}</Pill></td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(l.amount)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(l.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Reveal>
        </div>
      )}

      <Modal open={payOpen} title={`${t('recordPayment')} — ${profile?.name ?? ''}`} onClose={() => setPayOpen(false)}>
        <form onSubmit={submitPayment} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('outstandingCredit')}: <span className="font-semibold text-foreground">{formatCurrency(profile?.outstandingBalance ?? 0)}</span></p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
            <input required type="number" min={1} max={profile?.outstandingBalance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
