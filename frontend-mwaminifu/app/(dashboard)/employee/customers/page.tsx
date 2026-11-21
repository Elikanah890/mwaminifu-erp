'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Customer } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Search, Plus, User } from 'lucide-react';
import { usePermissions } from '@/lib/context/PermissionsContext';
import AccessDenied from '@/components/AccessDenied';

export default function EmployeeCustomersPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const { can, loading: permsLoading } = usePermissions();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', creditLimit: '' });

  const allowed = can('customers:view') || can('credit:read') || can('credit:create');

  useEffect(() => {
    if (!activeShopId || !allowed) return;
    const timer = setTimeout(() => {
      setLoading(true);
      const q = search ? `&search=${encodeURIComponent(search)}` : '';
      apiClient.get<Customer[]>(`/shops/${activeShopId}/customers?limit=200${q}`)
        .then((res) => setCustomers(res.data ?? []))
        .catch((err) => toast(errorMessage(err), 'error'))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, search, allowed, refreshKey]);

  if (permsLoading) {
    return <PageWrapper title={t('customers')}><SkeletonTable rows={6} /></PageWrapper>;
  }
  if (!(can('customers:view') || can('credit:read') || can('credit:create'))) {
    return <PageWrapper title={t('customers')}><AccessDenied /></PageWrapper>;
  }

  const submitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShopId) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/shops/${activeShopId}/customers`, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        creditLimit: Number(form.creditLimit) || 0,
      });
      toast(t('addCustomer'), 'success');
      setAddOpen(false);
      setForm({ name: '', phone: '', email: '', creditLimit: '' });
      setRefreshKey((v) => v + 1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper
      title={t('customers')}
      description={t('customers')}
      breadcrumb={[t('employeePortal'), t('customers')]}
      actions={can('customers:create') ? <button onClick={() => setAddOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addCustomer')}</button> : undefined}
    >
      <Reveal className="mb-6">
        <div className="surface-card p-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className="input-field pl-9" />
          </div>
        </div>
      </Reveal>

      {shopLoading || loading ? (
        <SkeletonTable rows={6} />
      ) : customers.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState
          icon={<User size={22} />}
          title={t('noCustomersYet')}
          description={t('noCustomersDesc')}
          action={can('customers:create') ? <button onClick={() => setAddOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addCustomer')}</button> : undefined}
        /></div></Reveal>
      ) : (
        <Reveal>
          <div className="surface-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('name')}</th>
                  <th className="px-4 py-3 font-semibold">{t('phone')}</th>
                  <th className="px-4 py-3 font-semibold">{t('email')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('outstandingCredit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email ?? '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(c.outstandingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
      <Modal open={addOpen} title={t('addCustomer')} onClose={() => setAddOpen(false)}>
        <form onSubmit={submitCustomer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('name')}</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('phone')}</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('email')}</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('creditLimit')}</label>
            <input type="number" min={0} value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('saving') : t('addCustomer')}</button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
