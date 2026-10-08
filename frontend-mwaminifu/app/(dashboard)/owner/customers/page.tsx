'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Customer } from '@/lib/types';
import { formatCurrency, formatDate, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Plus, HandCoins, FileText, Search, Pencil, Trash2, Download, User } from 'lucide-react';
import Link from 'next/link';

type CreditPayment = { id: string; amount: number; paymentDate: string; method: string; notes?: string | null };

export default function OwnerCustomersPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [payTarget, setPayTarget] = useState<Customer | null>(null);
  const [statementTarget, setStatementTarget] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '', creditLimit: '' });
  const [payAmount, setPayAmount] = useState('');
  const [statement, setStatement] = useState<{ payments: CreditPayment[]; sales: Array<{ receiptNumber?: string | null; grandTotal: number; saleDate: string }> } | null>(null);

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    apiClient.get<Customer[]>(`/shops/${activeShopId}/customers?limit=200${q}`)
      .then((res) => setCustomers(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', phone: '', email: '', address: '', notes: '', creditLimit: '' });
    setAddOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', notes: c.notes ?? '', creditLimit: String(c.creditLimit ?? 0) });
    setAddOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { name: form.name, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined, notes: form.notes || undefined, creditLimit: Number(form.creditLimit) || 0 };
      if (editing) {
        await apiClient.put(`/customers/${editing.id}`, body);
        toast(t('update'), 'success');
      } else {
        await apiClient.post(`/shops/${activeShopId}/customers`, body);
        toast(t('addCustomer'), 'success');
      }
      setAddOpen(false);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c: Customer) => {
    if (c.outstandingBalance > 0) {
      toast(t('outstandingCredit') + ' > 0', 'error');
      return;
    }
    if (!window.confirm(`${t('archive')} ${c.name}?`)) return;
    try {
      await apiClient.del(`/customers/${c.id}`);
      toast(t('archive'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/customers/${payTarget.id}/credit-payment`, { amount: Number(payAmount), method: 'cash' });
      toast(t('recordPayment'), 'success');
      setPayTarget(null);
      setPayAmount('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openStatement = async (c: Customer) => {
    setStatementTarget(c);
    setStatement(null);
    try {
      const [hist, purchases] = await Promise.all([
        apiClient.get<{ payments: CreditPayment[] }>(`/customers/${c.id}/credit-history`),
        apiClient.get<{ sales: Array<{ receiptNumber?: string | null; grandTotal: number; saleDate: string }> }>(`/customers/${c.id}/purchase-history`),
      ]);
      setStatement({ payments: hist.data?.payments ?? [], sales: purchases.data?.sales ?? [] });
    } catch {
      setStatement({ payments: [], sales: [] });
    }
  };

  const shareStatement = () => {
    if (!statementTarget) return;
    const payments = statement?.payments ?? [];
    const lines = payments.map((p) => `${formatDate(p.paymentDate)} — ${formatCurrency(p.amount)}`).join('\n');
    const text = `*${t('statement')}: ${statementTarget.name}*\n${t('outstandingCredit')}: ${formatCurrency(statementTarget.outstandingBalance)}\n\n${lines || t('noData')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <PageWrapper
      title={`${t('customers')} & ${t('credit')}`}
      description={t('receivables')}
      breadcrumb={['Owner', t('customers')]}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => apiClient.download(`/shops/${activeShopId}/reports/customers/export?format=csv`, 'customers.csv')} className="btn-outline inline-flex items-center gap-2 text-sm"><Download size={16} /> {t('csvExport')}</button>
          <button onClick={openCreate} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addCustomer')}</button>
        </div>
      }
    >
      <Reveal className="mb-6"><div className="surface-card p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t('search')}...`} className="input-field pl-9" />
        </div>
      </div></Reveal>

      {shopLoading || loading ? (
        <SkeletonTable rows={8} />
      ) : customers.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('name')}</th>
                <th className="px-4 py-3">{t('phone')}</th>
                <th className="px-4 py-3 text-right">{t('outstandingCredit')}</th>
                <th className="px-4 py-3 text-right">{t('creditLimit')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <Link href={`/owner/customers/${c.id}`} className="hover:text-secondary hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(c.outstandingBalance)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(c.creditLimit ?? 0)}</td>
                  <td className="px-4 py-3">
                    {c.isBlacklisted ? <Pill tone="red">{t('blacklisted')}</Pill> : c.outstandingBalance > 0 ? <Pill tone="amber">{t('credit')}</Pill> : <Pill tone="green">{t('active')}</Pill>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/owner/customers/${c.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><User size={14} /> {t('viewProfile')}</Link>
                      <button onClick={() => openStatement(c)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><FileText size={14} /></button>
                      {c.outstandingBalance > 0 && (
                        <button onClick={() => { setPayTarget(c); setPayAmount(''); }} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"><HandCoins size={14} /></button>
                      )}
                      <button onClick={() => openEdit(c)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Pencil size={14} /></button>
                      <button onClick={() => remove(c)} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}

      <Modal open={addOpen} title={editing ? t('edit') : t('addCustomer')} onClose={() => setAddOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('name')}</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('phone')}</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('email')}</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('address')}</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('creditLimit')}</label>
            <input type="number" min={0} value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('notes')}</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <Modal open={!!payTarget} title={`${t('recordPayment')} — ${payTarget?.name ?? ''}`} onClose={() => setPayTarget(null)}>
        <form onSubmit={submitPayment} className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('outstandingCredit')}: <span className="font-semibold text-foreground">{formatCurrency(payTarget?.outstandingBalance ?? 0)}</span></p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
            <input required type="number" min={1} max={payTarget?.outstandingBalance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <Modal open={!!statementTarget} title={`${t('statement')} — ${statementTarget?.name ?? ''}`} onClose={() => setStatementTarget(null)} wide>
        {statementTarget && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted rounded-lg p-4"><p className="text-xs text-muted-foreground">{t('outstandingCredit')}</p><p className="text-lg font-bold text-primary">{formatCurrency(statementTarget.outstandingBalance)}</p></div>
              <div className="bg-muted rounded-lg p-4"><p className="text-xs text-muted-foreground">{t('totalCreditGiven')}</p><p className="text-lg font-bold text-secondary">{formatCurrency(statementTarget.totalCreditGiven)}</p></div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-2">{t('recordPayment')}</h3>
            {!statement ? (
              <SkeletonCard rows={3} />
            ) : (statement.payments.length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              <ul className="divide-y divide-border mb-4 max-h-56 overflow-y-auto">
                {statement.payments.map((p) => (
                  <li key={p.id} className="py-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(p.paymentDate)}</span>
                    <span className="font-medium text-secondary">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ))}
            <button onClick={shareStatement} className="btn-teal w-full mt-4">{t('shareWhatsApp')}</button>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
