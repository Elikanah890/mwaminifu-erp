'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Expense, RecurringExpense, OwnerCapitalTransaction, CapitalSummary } from '@/lib/types';
import { formatCurrency, formatDate, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Stagger, StaggerItem, Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import StatsCard from '@/components/StatsCard';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Plus, Receipt, Trash2, RefreshCw, TrendingUp, TrendingDown, Check, X } from 'lucide-react';

const CATEGORIES = ['Rent', 'Wages', 'Transport', 'Utilities', 'Restocking', 'Food', 'Other'];

type Tab = 'expenses' | 'recurring' | 'capital';

export default function OwnerExpensesPage() {
  const { activeShopId } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('expenses');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ category: 'Rent', amount: '', description: '', expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' });

  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ category: 'Rent', amount: '', frequency: 'MONTHLY', dayOfWeek: '1', dayOfMonth: '1' });

  const [capital, setCapital] = useState<OwnerCapitalTransaction[]>([]);
  const [capitalSummary, setCapitalSummary] = useState<CapitalSummary | null>(null);
  const [capitalLoading, setCapitalLoading] = useState(false);
  const [capitalOpen, setCapitalOpen] = useState(false);
  const [capitalForm, setCapitalForm] = useState({ type: 'INJECTION', amount: '', note: '' });

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString() ? `?${params.toString()}` : '';
    apiClient.get<Expense[]>(`/shops/${activeShopId}/expenses?limit=200${qs}`)
      .then((res) => setExpenses(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load();   }, [activeShopId, from, to]);

  const loadRecurring = () => {
    if (!activeShopId) return;
    setRecurringLoading(true);
    apiClient.get<RecurringExpense[]>(`/shops/${activeShopId}/recurring-expenses`)
      .then((res) => setRecurring(res.data ?? []))
      .catch(() => {})
      .finally(() => setRecurringLoading(false));
  };

  useEffect(() => { if (tab === 'recurring') loadRecurring();   }, [activeShopId, tab]);

  const loadCapital = () => {
    if (!activeShopId) return;
    setCapitalLoading(true);
    Promise.all([
      apiClient.get<OwnerCapitalTransaction[]>(`/shops/${activeShopId}/capital-transactions`),
      apiClient.get<CapitalSummary>(`/shops/${activeShopId}/capital-transactions/summary`),
    ])
      .then(([tr, s]) => { setCapital(tr.data ?? []); setCapitalSummary(s.data ?? null); })
      .catch(() => {})
      .finally(() => setCapitalLoading(false));
  };

  useEffect(() => { if (tab === 'capital') loadCapital();   }, [activeShopId, tab]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(`/shops/${activeShopId}/expenses`, {
        category: form.category,
        amount: Number(form.amount),
        description: form.description,
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod,
      });
      toast(t('create'), 'success');
      setAddOpen(false);
      setForm({ category: 'Rent', amount: '', description: '', expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' });
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExpense = async (e: Expense) => {
    if (!window.confirm(`${t('delete')}?`)) return;
    setSubmitting(true);
    try {
      await apiClient.del(`/expenses/${e.id}`);
      toast(t('delete'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const setApproval = async (e: Expense, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.put(`/expenses/${e.id}/${status.toLowerCase()}`);
      toast(status === 'APPROVED' ? t('approve') : t('reject'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const submitRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { category: recurringForm.category, amount: Number(recurringForm.amount), frequency: recurringForm.frequency };
      if (recurringForm.frequency === 'WEEKLY') payload.dayOfWeek = Number(recurringForm.dayOfWeek);
      if (recurringForm.frequency === 'MONTHLY') payload.dayOfMonth = Number(recurringForm.dayOfMonth);
      await apiClient.post(`/shops/${activeShopId}/recurring-expenses`, payload);
      toast(t('create'), 'success');
      setRecurringOpen(false);
      loadRecurring();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRecurring = async (r: RecurringExpense) => {
    try {
      await apiClient.put(`/shops/${activeShopId}/recurring-expenses/${r.id}/toggle`, {});
      loadRecurring();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const deleteRecurring = async (r: RecurringExpense) => {
    if (!window.confirm(`${t('delete')}?`)) return;
    try {
      await apiClient.del(`/shops/${activeShopId}/recurring-expenses/${r.id}`);
      loadRecurring();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const generateDue = async () => {
    try {
      await apiClient.post(`/shops/${activeShopId}/recurring-expenses/generate-due`, {});
      loadRecurring();
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const submitCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(`/shops/${activeShopId}/capital-transactions`, { type: capitalForm.type, amount: Number(capitalForm.amount), note: capitalForm.note || undefined });
      toast(t('create'), 'success');
      setCapitalOpen(false);
      loadCapital();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!statusFilter) return expenses;
    return expenses.filter((e) => (e.approvalStatus ?? 'APPROVED') === statusFilter);
  }, [expenses, statusFilter]);

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return Object.entries(map).map(([category, total]) => ({ category, total }));
  }, [expenses]);

  const pendingCount = expenses.filter((e) => e.approvalStatus === 'PENDING').length;

  return (
    <PageWrapper title={t('expenses')} description={t('expenses')} breadcrumb={['Owner', t('finance'), t('expenses')]}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2">
          {(['expenses', 'recurring', 'capital'] as Tab[]).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)} className={`px-4 py-2 rounded-lg text-sm font-medium border capitalize ${tab === tb ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}>
              {tb === 'expenses' ? t('expenses') : tb === 'recurring' ? t('recurring') : t('capital')}
            </button>
          ))}
        </div>
        <button onClick={() => { if (tab === 'expenses') setAddOpen(true); else if (tab === 'recurring') setRecurringOpen(true); else setCapitalOpen(true); }} className="btn-navy inline-flex items-center gap-2">
          <Plus size={16} /> {t('add')}
        </button>
      </div>

      {tab === 'expenses' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input type="date" className="input-field max-w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="input-field max-w-[160px]" value={to} onChange={(e) => setTo(e.target.value)} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field max-w-[160px]">
              <option value="">{t('all')}</option>
              <option value="PENDING">{t('pending')}</option>
              <option value="APPROVED">{t('approved')}</option>
              <option value="REJECTED">{t('rejected')}</option>
            </select>
          </div>

          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StaggerItem><StatsCard title={t('expenses')} value={formatCurrency(total)} tone="red" icon={<Receipt size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('transactionsCount')} value={String(expenses.length)} tone="navy" /></StaggerItem>
            <StaggerItem><StatsCard title={t('pending')} value={String(pendingCount)} tone="gold" /></StaggerItem>
            {byCategory.slice(0, 1).map((c) => <StaggerItem key={c.category}><StatsCard title={c.category} value={formatCurrency(c.total)} tone="teal" /></StaggerItem>)}
          </Stagger>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartWrapper title={t('expenses')} subtitle={t('transactions')} className="lg:col-span-2">
              {loading ? (
                <SkeletonTable rows={6} />
              ) : filteredExpenses.length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                      <tr>
                        <th className="px-4 py-2">{t('date')}</th>
                        <th className="px-4 py-2">{t('category')}</th>
                        <th className="px-4 py-2">{t('description')}</th>
                        <th className="px-4 py-2">{t('paymentMethod')}</th>
                        <th className="px-4 py-2">{t('status')}</th>
                        <th className="px-4 py-2 text-right">{t('amount')}</th>
                        <th className="px-4 py-2 text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredExpenses.map((e) => (
                        <tr key={e.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                          <td className="px-4 py-2 text-muted-foreground">{formatDate(e.expenseDate)}</td>
                          <td className="px-4 py-2"><span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{e.category}</span></td>
                          <td className="px-4 py-2 text-muted-foreground">{e.description ?? '-'}</td>
                          <td className="px-4 py-2 text-muted-foreground capitalize">{e.paymentMethod ?? 'cash'}</td>
                          <td className="px-4 py-2">
                            {(e.approvalStatus ?? 'APPROVED') === 'PENDING' ? <Pill tone="amber">{t('pending')}</Pill> : (e.approvalStatus ?? 'APPROVED') === 'APPROVED' ? <Pill tone="green">{t('approved')}</Pill> : <Pill tone="red">{t('rejected')}</Pill>}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-danger">{formatCurrency(e.amount)}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(e.approvalStatus ?? 'APPROVED') === 'PENDING' && (
                                <>
                                  <button onClick={() => setApproval(e, 'APPROVED')} className="text-secondary hover:underline" title={t('approve')}><Check size={14} /></button>
                                  <button onClick={() => setApproval(e, 'REJECTED')} className="text-danger hover:underline" title={t('reject')}><X size={14} /></button>
                                </>
                              )}
                              <button onClick={() => deleteExpense(e)} className="text-danger hover:underline" title={t('delete')}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartWrapper>

            <ChartWrapper title={t('byCategory')} subtitle={t('expenses')}>
              {byCategory.length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <ul className="divide-y divide-border">
                  {byCategory.map((c) => (
                    <li key={c.category} className="py-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">{c.category}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(c.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartWrapper>
          </div>
        </>
      )}

      {tab === 'recurring' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{t('recurring')}</p>
            <button onClick={generateDue} className="btn-teal inline-flex items-center gap-2 text-sm"><RefreshCw size={14} /> {t('create')}</button>
          </div>
          {recurringLoading ? (
            <SkeletonTable rows={5} />
          ) : recurring.length === 0 ? (
            <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
          ) : (
            <Reveal><div className="surface-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                  <tr><th className="px-4 py-3">{t('category')}</th><th className="px-4 py-3 text-right">{t('amount')}</th><th className="px-4 py-3">{t('frequency')}</th><th className="px-4 py-3">{t('date')}</th><th className="px-4 py-3">{t('status')}</th><th className="px-4 py-3 text-right">{t('actions')}</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recurring.map((r) => (
                    <tr key={r.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                      <td className="px-4 py-3 font-medium text-foreground">{r.category}</td>
                      <td className="px-4 py-3 text-right font-semibold text-danger">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{r.frequency.toLowerCase()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(r.nextDate)}</td>
                      <td className="px-4 py-3"><Pill tone={r.isActive ? 'green' : 'gray'}>{r.isActive ? t('active') : t('inactive')}</Pill></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => toggleRecurring(r)} className="text-xs font-medium text-primary hover:underline">{r.isActive ? t('cancel') : t('activate')}</button>
                          <button onClick={() => deleteRecurring(r)} className="text-xs font-medium text-danger hover:underline">{t('delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></Reveal>
          )}
        </>
      )}

      {tab === 'capital' && (
        <>
          <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StaggerItem><StatsCard title={t('injections')} value={formatCurrency(capitalSummary?.injections ?? 0)} tone="teal" icon={<TrendingUp size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('drawings')} value={formatCurrency(capitalSummary?.drawings ?? 0)} tone="red" icon={<TrendingDown size={20} />} /></StaggerItem>
            <StaggerItem><StatsCard title={t('net')} value={formatCurrency(capitalSummary?.net ?? 0)} tone="navy" /></StaggerItem>
          </Stagger>
          {capitalLoading ? (
            <SkeletonTable rows={5} />
          ) : capital.length === 0 ? (
            <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
          ) : (
            <Reveal><div className="surface-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                  <tr><th className="px-4 py-3">{t('date')}</th><th className="px-4 py-3">{t('type')}</th><th className="px-4 py-3">{t('notes')}</th><th className="px-4 py-3 text-right">{t('amount')}</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {capital.map((c) => (
                    <tr key={c.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3"><Pill tone={c.type === 'INJECTION' ? 'green' : 'red'}>{c.type === 'INJECTION' ? t('injections') : t('drawings')}</Pill></td>
                      <td className="px-4 py-3 text-muted-foreground">{c.note ?? '-'}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${c.type === 'INJECTION' ? 'text-secondary' : 'text-danger'}`}>{c.type === 'INJECTION' ? '+' : '−'}{formatCurrency(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></Reveal>
          )}
        </>
      )}

      <Modal open={addOpen} title={t('addExpense')} onClose={() => setAddOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('category')}</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
            <input required type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('date')}</label>
            <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('paymentMethod')}</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-field">
              <option value="cash">{t('cash')}</option>
              <option value="mobile">{t('mobileMoney')}</option>
              <option value="bank">{t('bank')}</option>
              <option value="card">{t('card')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('description')}</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <Modal open={recurringOpen} title={t('recurring')} onClose={() => setRecurringOpen(false)}>
        <form onSubmit={submitRecurring} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('category')}</label>
            <select value={recurringForm.category} onChange={(e) => setRecurringForm({ ...recurringForm, category: e.target.value })} className="input-field">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
            <input required type="number" min={1} value={recurringForm.amount} onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('frequency')}</label>
            <select value={recurringForm.frequency} onChange={(e) => setRecurringForm({ ...recurringForm, frequency: e.target.value })} className="input-field">
              <option value="DAILY">{t('daily')}</option>
              <option value="WEEKLY">{t('weekly')}</option>
              <option value="MONTHLY">{t('monthly')}</option>
            </select>
          </div>
          {recurringForm.frequency === 'MONTHLY' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('dayOfMonth')}</label>
              <input type="number" min={1} max={28} value={recurringForm.dayOfMonth} onChange={(e) => setRecurringForm({ ...recurringForm, dayOfMonth: e.target.value })} className="input-field" />
            </div>
          )}
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <Modal open={capitalOpen} title={t('capital')} onClose={() => setCapitalOpen(false)}>
        <form onSubmit={submitCapital} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('type')}</label>
            <select value={capitalForm.type} onChange={(e) => setCapitalForm({ ...capitalForm, type: e.target.value })} className="input-field">
              <option value="INJECTION">{t('injections')}</option>
              <option value="DRAWING">{t('drawings')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
            <input required type="number" min={1} value={capitalForm.amount} onChange={(e) => setCapitalForm({ ...capitalForm, amount: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('notes')}</label>
            <input value={capitalForm.note} onChange={(e) => setCapitalForm({ ...capitalForm, note: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
