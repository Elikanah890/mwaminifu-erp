'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { usePermissions } from '@/lib/context/PermissionsContext';
import { Purchase, Supplier, Product } from '@/lib/types';
import { formatCurrency, formatDate, errorMessage } from '@/lib/format';
import { statusLabel } from '@/lib/i18n/labels';
import PageWrapper from '@/components/PageWrapper';
import AccessDenied from '@/components/AccessDenied';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Plus, PackageCheck, Banknote, X } from 'lucide-react';

const statusTone: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'teal' | 'navy'> = {
  DRAFT: 'gray', ORDERED: 'navy', PARTIALLY_RECEIVED: 'amber', RECEIVED: 'green', CANCELLED: 'red',
  PAID: 'green', PARTIAL: 'amber', UNPAID: 'red',
};

export default function EmployeePurchasesPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { can, loading: permsLoading } = usePermissions();
  const { toast } = useToast();
  const canView = can('purchases:view');
  const canCreate = can('purchases:create');
  const canApprove = can('purchases:approve');
  const allowed = canView || canCreate || canApprove;

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ supplierId: '', invoiceNo: '', productId: '', quantity: '1', unitCost: '', tax: '', discount: '' });
  const [payTarget, setPayTarget] = useState<Purchase | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash' });

  const load = () => {
    if (!activeShopId || !allowed) return;
    setLoading(true);
    Promise.all([
      canView ? apiClient.get<Purchase[]>(`/shops/${activeShopId}/purchases?limit=200`) : Promise.resolve({ data: [] as Purchase[] }),
      canView || canCreate ? apiClient.get<Supplier[]>(`/shops/${activeShopId}/suppliers?limit=200`) : Promise.resolve({ data: [] as Supplier[] }),
      canCreate ? apiClient.get<Product[]>(`/shops/${activeShopId}/products?limit=300`) : Promise.resolve({ data: [] as Product[] }),
    ])
      .then(([p, s, pr]) => { setPurchases(p.data ?? []); setSuppliers(s.data ?? []); setProducts(pr.data ?? []); })
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, canView, canCreate, allowed]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShopId || !canCreate || !form.productId) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/shops/${activeShopId}/purchases`, {
        supplierId: form.supplierId || undefined,
        invoiceNo: form.invoiceNo || undefined,
        items: [{ productId: form.productId, quantity: Number(form.quantity), unitCost: Number(form.unitCost) || 0 }],
        tax: Number(form.tax) || 0,
        discount: Number(form.discount) || 0,
        status: 'ORDERED',
      });
      toast(t('addPurchase'), 'success');
      setCreateOpen(false);
      setForm({ supplierId: '', invoiceNo: '', productId: '', quantity: '1', unitCost: '', tax: '', discount: '' });
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const receive = async (purchase: Purchase) => {
    if (!canCreate) return;
    try {
      await apiClient.post(`/purchases/${purchase.id}/receive`, { receivedAll: true });
      toast(t('receiveStock'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const cancel = async (purchase: Purchase) => {
    if (!canApprove || !window.confirm(`${t('cancel')}?`)) return;
    try {
      await apiClient.put(`/purchases/${purchase.id}/cancel`);
      toast(t('cancel'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const submitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/purchases/${payTarget.id}/pay`, { amount: Number(payForm.amount), method: payForm.method });
      toast(t('recordPayment'), 'success');
      setPayTarget(null);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (permsLoading) return <PageWrapper title={t('purchases')}><SkeletonTable rows={6} /></PageWrapper>;
  if (!allowed) return <PageWrapper title={t('purchases')}><AccessDenied /></PageWrapper>;

  return (
    <PageWrapper
      title={t('purchases')}
      description={t('purchases')}
      breadcrumb={[t('employeePortal'), t('purchases')]}
      actions={canCreate ? <button onClick={() => setCreateOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addPurchase')}</button> : undefined}
    >
      {canView ? (
        shopLoading || loading ? (
          <SkeletonTable rows={6} />
        ) : purchases.length === 0 ? (
          <Reveal><div className="surface-card"><EmptyState title={t('noPurchasesYet')} description={t('noPurchasesDesc')} action={canCreate ? <button onClick={() => setCreateOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addPurchase')}</button> : undefined} /></div></Reveal>
        ) : (
          <Reveal><div className="surface-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr>
                  <th className="px-4 py-3">{t('date')}</th>
                  <th className="px-4 py-3">{t('supplier')}</th>
                  <th className="px-4 py-3">{t('invoiceNo')}</th>
                  <th className="px-4 py-3">{t('status')}</th>
                  <th className="px-4 py-3">{t('payment')}</th>
                  <th className="px-4 py-3 text-right">{t('total')}</th>
                  <th className="px-4 py-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-muted transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.supplier?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.invoiceNo ?? '-'}</td>
                    <td className="px-4 py-3"><Pill tone={statusTone[p.status] ?? 'gray'}>{statusLabel(t, p.status)}</Pill></td>
                    <td className="px-4 py-3"><Pill tone={statusTone[p.paymentStatus] ?? 'gray'}>{statusLabel(t, p.paymentStatus)}</Pill></td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {canCreate && (p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED') && (
                          <button onClick={() => receive(p)} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"><PackageCheck size={14} /> {t('receiveStock')}</button>
                        )}
                        {canApprove && p.paymentStatus !== 'PAID' && p.status !== 'CANCELLED' && (
                          <button onClick={() => { setPayTarget(p); setPayForm({ amount: String(Math.max(0, p.total - p.amountPaid)), method: 'cash' }); }} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"><Banknote size={14} /> {t('recordPayment')}</button>
                        )}
                        {canApprove && (p.status === 'DRAFT' || p.status === 'ORDERED') && (
                          <button onClick={() => cancel(p)} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"><X size={14} /> {t('cancel')}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></Reveal>
        )
      ) : (
        <Reveal><div className="surface-card"><EmptyState title={t('addPurchase')} description={t('purchases')} action={canCreate ? <button onClick={() => setCreateOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addPurchase')}</button> : undefined} /></div></Reveal>
      )}

      <Modal open={createOpen} title={t('addPurchase')} onClose={() => setCreateOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('supplier')}</label>
            <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="input-field">
              <option value="">—</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('invoiceNo')}</label>
            <input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('product')}</label>
            <select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="input-field">
              <option value="">—</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('quantity')}</label>
              <input required type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('costPrice')}</label>
              <input required type="number" min={0} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('tax')}</label>
              <input type="number" min={0} value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('discount')}</label>
              <input type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="input-field" />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('saving') : t('save')}</button>
        </form>
      </Modal>

      <Modal open={!!payTarget} title={t('recordPayment')} onClose={() => setPayTarget(null)}>
        <form onSubmit={submitPay} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
            <input required type="number" min={1} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('paymentMethod')}</label>
            <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="input-field">
              <option value="cash">{t('cash')}</option>
              <option value="mobile">{t('mobileMoney')}</option>
              <option value="bank">{t('bank')}</option>
              <option value="card">{t('card')}</option>
            </select>
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('saving') : t('save')}</button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
