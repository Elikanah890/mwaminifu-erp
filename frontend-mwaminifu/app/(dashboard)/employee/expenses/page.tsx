'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { usePermissions } from '@/lib/context/PermissionsContext';
import { Expense, ExpenseCategory } from '@/lib/types';
import { formatCurrency, formatDate, errorMessage } from '@/lib/format';
import { paymentMethodLabel } from '@/lib/i18n/labels';
import PageWrapper from '@/components/PageWrapper';
import AccessDenied from '@/components/AccessDenied';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import ExpenseCategorySelect, { categoryLabel } from '@/components/expenses/ExpenseCategorySelect';
import { Plus, Receipt, Check, X, Trash2 } from 'lucide-react';

export default function EmployeeExpensesPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t, locale } = useI18n();
  const { can, loading: permsLoading } = usePermissions();
  const { toast } = useToast();
  const allowed = can('expenses:read') || can('expenses:create') || can('expenses:approve');
  const canRead = can('expenses:read');
  const canCreate = can('expenses:create');
  const canApprove = can('expenses:approve');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: 'Rent', amount: '', description: '', expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' });

  const load = () => {
    if (!activeShopId || !canRead) return;
    setLoading(true);
    apiClient.get<Expense[]>(`/shops/${activeShopId}/expenses?limit=200`)
      .then((res) => setExpenses(res.data ?? []))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [activeShopId, canRead]);

  useEffect(() => {
    if (!activeShopId || !allowed) return;
    apiClient.get<ExpenseCategory[]>(`/shops/${activeShopId}/expense-categories`)
      .then((res) => setCategories(res.data ?? []))
      .catch(() => {});
  }, [activeShopId, allowed]);

  useEffect(() => {
    if (!categories.length) return;
    setForm((prev) => categories.some((c) => c.value === prev.category) ? prev : { ...prev, category: categories[0].value });
  }, [categories]);

  const labelForCategory = useMemo(() => {
    const byValue = new Map(categories.map((c) => [c.value, c]));
    return (value: string) => {
      const category = byValue.get(value);
      return category ? categoryLabel(category, locale) : value;
    };
  }, [categories, locale]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShopId || !canCreate) return;
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
      setForm({ category: categories[0]?.value ?? 'Rent', amount: '', description: '', expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' });
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const setApproval = async (expense: Expense, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.put(`/expenses/${expense.id}/${status === 'APPROVED' ? 'approve' : 'reject'}`);
      toast(status === 'APPROVED' ? t('approve') : t('reject'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const remove = async (expense: Expense) => {
    if (!window.confirm(`${t('delete')}?`)) return;
    try {
      await apiClient.del(`/expenses/${expense.id}`);
      toast(t('delete'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (permsLoading) return <PageWrapper title={t('expenses')}><SkeletonTable rows={6} /></PageWrapper>;
  if (!allowed) return <PageWrapper title={t('expenses')}><AccessDenied /></PageWrapper>;

  return (
    <PageWrapper
      title={t('expenses')}
      description={t('expenses')}
      breadcrumb={[t('employeePortal'), t('expenses')]}
      actions={canCreate ? <button onClick={() => setAddOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addExpense')}</button> : undefined}
    >
      {canRead ? (
        shopLoading || loading ? (
          <SkeletonTable rows={6} />
        ) : expenses.length === 0 ? (
          <Reveal><div className="surface-card"><EmptyState icon={<Receipt size={22} />} title={t('noExpensesYet')} description={t('noExpensesDesc')} action={canCreate ? <button onClick={() => setAddOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addExpense')}</button> : undefined} /></div></Reveal>
        ) : (
          <Reveal><div className="surface-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr>
                  <th className="px-4 py-3">{t('date')}</th>
                  <th className="px-4 py-3">{t('category')}</th>
                  <th className="px-4 py-3">{t('description')}</th>
                  <th className="px-4 py-3">{t('paymentMethod')}</th>
                  <th className="px-4 py-3">{t('status')}</th>
                  <th className="px-4 py-3 text-right">{t('amount')}</th>
                  <th className="px-4 py-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(expense.expenseDate)}</td>
                    <td className="px-4 py-3"><span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{labelForCategory(expense.category)}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{expense.description ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{paymentMethodLabel(t, expense.paymentMethod ?? 'cash')}</td>
                    <td className="px-4 py-3">
                      {(expense.approvalStatus ?? 'APPROVED') === 'PENDING' ? <Pill tone="amber">{t('pending')}</Pill> : (expense.approvalStatus ?? 'APPROVED') === 'APPROVED' ? <Pill tone="green">{t('approved')}</Pill> : <Pill tone="red">{t('rejected')}</Pill>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-danger">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canApprove && (expense.approvalStatus ?? 'APPROVED') === 'PENDING' && (
                          <>
                            <button onClick={() => setApproval(expense, 'APPROVED')} className="text-secondary hover:underline" title={t('approve')}><Check size={14} /></button>
                            <button onClick={() => setApproval(expense, 'REJECTED')} className="text-danger hover:underline" title={t('reject')}><X size={14} /></button>
                          </>
                        )}
                        {canCreate && <button onClick={() => remove(expense)} className="text-danger hover:underline" title={t('delete')}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></Reveal>
        )
      ) : (
        <Reveal><div className="surface-card"><EmptyState icon={<Receipt size={22} />} title={t('addExpense')} description={t('expenses')} action={canCreate ? <button onClick={() => setAddOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addExpense')}</button> : undefined} /></div></Reveal>
      )}

      <Modal open={addOpen} title={t('addExpense')} onClose={() => setAddOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('category')}</label>
            <ExpenseCategorySelect shopId={activeShopId ?? ''} value={form.category} onChange={(value) => setForm({ ...form, category: value })} categories={categories} onCreated={(category) => setCategories((prev) => [...prev, category])} />
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
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('saving') : t('save')}</button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
