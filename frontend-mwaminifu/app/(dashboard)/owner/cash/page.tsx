'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { CashTransaction, CashSummary } from '@/lib/types';
import { formatCurrency, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import StatsCard from '@/components/StatsCard';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Plus, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const TYPES = ['OPENING', 'WITHDRAWAL', 'DEPOSIT', 'ADJUSTMENT'];

export default function CashPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type: 'DEPOSIT', amount: '', note: '' });

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    Promise.all([
      apiClient.get<CashTransaction[]>(`/shops/${activeShopId}/cash?limit=200`),
      apiClient.get<CashSummary>(`/shops/${activeShopId}/cash/summary`),
    ])
      .then(([tx, s]) => {
        setTransactions(tx.data ?? []);
        setSummary(s.data ?? null);
      })
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load();   }, [activeShopId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(`/shops/${activeShopId}/cash`, {
        type: form.type,
        amount: Number(form.amount),
        note: form.note || undefined,
      });
      toast(t('transactions'), 'success');
      setModalOpen(false);
      setForm({ type: 'DEPOSIT', amount: '', note: '' });
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper
      title={t('cashManagement')}
      description={t('cashManagement')}
      breadcrumb={['Owner', t('finance'), t('cash')]}
      actions={<button onClick={() => setModalOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('add')}</button>}
    >
      {shopLoading || loading ? (
        <div className="space-y-4"><SkeletonCard /><SkeletonTable rows={5} /></div>
      ) : (
        <>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StaggerItem><StatsCard title={t('openingBalance')} value={formatCurrency(summary?.openingBalance ?? 0)} tone="navy" icon={<Wallet size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('cashIn')} value={formatCurrency(summary?.totalIn ?? 0)} tone="teal" icon={<ArrowDownCircle size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('cashOut')} value={formatCurrency(summary?.totalOut ?? 0)} tone="red" icon={<ArrowUpCircle size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('closingBalance')} value={formatCurrency(summary?.closingBalance ?? 0)} tone="gold" icon={<Wallet size={20} />} /></StaggerItem>
          </Stagger>

          {transactions.length === 0 ? (
            <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
          ) : (
            <Reveal><div className="surface-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                  <tr>
                    <th className="px-4 py-3">{t('date')}</th>
                    <th className="px-4 py-3">{t('type')}</th>
                    <th className="px-4 py-3">{t('note')}</th>
                    <th className="px-4 py-3 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                      <td className="px-4 py-3"><Pill tone={tx.amount >= 0 ? 'green' : 'red'}>{tx.type}</Pill></td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.note ?? '-'}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${tx.amount >= 0 ? 'text-secondary' : 'text-danger'}`}>{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></Reveal>
          )}
        </>
      )}

      <Modal open={modalOpen} title={t('cashManagement')} onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('type')}</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
              {TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
            <input required type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('notes')}</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
