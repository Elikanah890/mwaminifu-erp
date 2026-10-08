'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Loan } from '@/lib/types';
import { formatCurrency, formatDate, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import StatsCard from '@/components/StatsCard';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Plus, Landmark, HandCoins, History, Pencil, Trash2 } from 'lucide-react';

export default function OwnerLoansPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [repayTarget, setRepayTarget] = useState<Loan | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Loan | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ lender: '', amount: '', interestRate: '', dueDate: '', notes: '' });
  const [repayAmount, setRepayAmount] = useState('');

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    apiClient.get<Loan[]>(`/shops/${activeShopId}/loans?limit=200`)
      .then((res) => setLoans(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load();   }, [activeShopId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ lender: '', amount: '', interestRate: '', dueDate: '', notes: '' });
    setAddOpen(true);
  };

  const openEdit = (l: Loan) => {
    setEditing(l);
    setForm({ lender: l.lender, amount: String(l.amount), interestRate: String(l.interestRate), dueDate: l.dueDate ? l.dueDate.slice(0, 10) : '', notes: l.notes ?? '' });
    setAddOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { lender: form.lender, amount: Number(form.amount), interestRate: Number(form.interestRate) || 0, dueDate: form.dueDate || undefined, notes: form.notes || undefined };
      if (editing) {
        await apiClient.put(`/loans/${editing.id}`, body);
        toast(t('update'), 'success');
      } else {
        await apiClient.post(`/shops/${activeShopId}/loans`, body);
        toast(t('create'), 'success');
      }
      setAddOpen(false);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayTarget) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/loans/${repayTarget.id}/repay`, { amount: Number(repayAmount), method: 'cash' });
      toast(t('recordPayment'), 'success');
      setRepayTarget(null);
      setRepayAmount('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (l: Loan) => {
    if (!window.confirm(`${t('delete')} ${l.lender}?`)) return;
    try {
      await apiClient.del(`/loans/${l.id}`);
      toast(t('delete'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const openHistory = async (l: Loan) => {
    setHistoryTarget(null);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get<Loan>(`/loans/${l.id}`);
      setHistoryTarget(res.data ?? null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const summary = useMemo(() => {
    const totalBorrowed = loans.reduce((s, l) => s + l.amount, 0);
    const totalOutstanding = loans.reduce((s, l) => s + l.remainingBalance, 0);
    return { totalBorrowed, totalOutstanding, totalRepaid: totalBorrowed - totalOutstanding };
  }, [loans]);

  return (
    <PageWrapper
      title={t('loans')}
      description={t('loans')}
      breadcrumb={['Owner', t('finance'), t('loans')]}
      actions={<button onClick={openCreate} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('create')}</button>}
    >
      <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StaggerItem><StatsCard title={t('principal')} value={formatCurrency(summary.totalBorrowed)} tone="navy" icon={<Landmark size={20} />} /></StaggerItem>
        <StaggerItem><StatsCard title={t('remainingBalance')} value={formatCurrency(summary.totalOutstanding)} tone="red" /></StaggerItem>
        <StaggerItem><StatsCard title={t('totalRepaid')} value={formatCurrency(summary.totalRepaid)} tone="teal" /></StaggerItem>
      </Stagger>

      {shopLoading || loading ? (
        <SkeletonTable rows={6} />
      ) : loans.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('lender')}</th>
                <th className="px-4 py-3 text-right">{t('amount')}</th>
                <th className="px-4 py-3 text-right">{t('remainingBalance')}</th>
                <th className="px-4 py-3 text-right">{t('interestRate')}</th>
                <th className="px-4 py-3">{t('dueDate')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loans.map((l) => (
                <tr key={l.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 font-medium text-foreground">{l.lender}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(l.amount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(l.remainingBalance)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{l.interestRate}%</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(l.dueDate)}</td>
                  <td className="px-4 py-3"><Pill tone={l.status === 'ACTIVE' ? 'amber' : l.status === 'PAID' ? 'green' : 'red'}>{l.status}</Pill></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openHistory(l)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><History size={14} /></button>
                      {l.status === 'ACTIVE' && (
                        <button onClick={() => { setRepayTarget(l); setRepayAmount(''); }} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"><HandCoins size={14} /></button>
                      )}
                      <button onClick={() => openEdit(l)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Pencil size={14} /></button>
                      <button onClick={() => remove(l)} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}

      <Modal open={addOpen} title={editing ? t('edit') : t('create')} onClose={() => setAddOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('lender')}</label>
            <input required value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
              <input required type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('interestRate')} (%)</label>
              <input type="number" min={0} step="0.1" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('dueDate')}</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('notes')}</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <Modal open={!!repayTarget} title={`${t('recordPayment')} — ${repayTarget?.lender ?? ''}`} onClose={() => setRepayTarget(null)}>
        <form onSubmit={submitRepayment} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('remainingBalance')}: <span className="font-semibold text-foreground">{formatCurrency(repayTarget?.remainingBalance ?? 0)}</span></p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
            <input required type="number" min={1} max={repayTarget?.remainingBalance} value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <Modal open={!!historyTarget || historyLoading} title={`${t('history')} — ${historyTarget?.lender ?? ''}`} onClose={() => setHistoryTarget(null)}>
        {historyLoading ? (
          <SkeletonCard rows={3} />
        ) : historyTarget ? (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted rounded-lg p-4"><p className="text-xs text-muted-foreground">{t('amount')}</p><p className="text-lg font-bold text-primary">{formatCurrency(historyTarget.amount)}</p></div>
              <div className="bg-muted rounded-lg p-4"><p className="text-xs text-muted-foreground">{t('remainingBalance')}</p><p className="text-lg font-bold text-danger">{formatCurrency(historyTarget.remainingBalance)}</p></div>
            </div>
            {(historyTarget.repayments ?? []).length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                {(historyTarget.repayments ?? []).map((r) => (
                  <li key={r.id} className="py-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(r.repaymentDate)} · {r.method}</span>
                    <span className="font-medium text-secondary">{formatCurrency(r.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Modal>
    </PageWrapper>
  );
}
