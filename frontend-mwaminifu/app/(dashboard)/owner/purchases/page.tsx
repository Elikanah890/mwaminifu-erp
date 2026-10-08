'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Purchase, Supplier, Product } from '@/lib/types';
import { formatCurrency, formatDate, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Plus, PackageCheck, Banknote, X, ScanBarcode } from 'lucide-react';

const statusTone: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'teal' | 'navy'> = {
  DRAFT: 'gray', ORDERED: 'navy', PARTIALLY_RECEIVED: 'amber', RECEIVED: 'green', CANCELLED: 'red',
  PAID: 'green', PARTIAL: 'amber', UNPAID: 'red',
};

export default function PurchasesPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ supplierId: '', invoiceNo: '', tax: '', discount: '' });
  const [lines, setLines] = useState<Array<{ productId: string; quantity: string; unitCost: string }>>([]);

  const [receiveTarget, setReceiveTarget] = useState<Purchase | null>(null);
  const [receiveAll, setReceiveAll] = useState(true);
  const [payTarget, setPayTarget] = useState<Purchase | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash' });
  const [scanOpen, setScanOpen] = useState(false);

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    Promise.all([
      apiClient.get<Purchase[]>(`/shops/${activeShopId}/purchases?limit=200`),
      apiClient.get<Supplier[]>(`/shops/${activeShopId}/suppliers?limit=200`),
      apiClient.get<Product[]>(`/shops/${activeShopId}/products?limit=300`),
    ])
      .then(([p, s, pr]) => {
        setPurchases(p.data ?? []);
        setSuppliers(s.data ?? []);
        setProducts(pr.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load();   }, [activeShopId]);

  const addLine = () => setLines((prev) => [...prev, { productId: '', quantity: '1', unitCost: '' }]);

  const handleScan = async (barcode: string) => {
    setScanOpen(false);
    if (!barcode) return;
    try {
      const res = await apiClient.get<Product>(`/shops/${activeShopId}/products/by-barcode/${encodeURIComponent(barcode)}`);
      if (res.data) {
        setLines((prev) => [...prev, { productId: res.data!.id, quantity: '1', unitCost: String(res.data!.costPrice ?? 0) }]);
        toast(res.data.name, 'success');
      } else {
        toast(t('noResults'), 'error');
      }
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      toast(t('emptyCart'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/shops/${activeShopId}/purchases`, {
        supplierId: form.supplierId || undefined,
        invoiceNo: form.invoiceNo || undefined,
        items: validLines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0 })),
        tax: Number(form.tax) || 0,
        discount: Number(form.discount) || 0,
        status: 'ORDERED',
      });
      toast(t('addPurchase'), 'success');
      setCreateOpen(false);
      setForm({ supplierId: '', invoiceNo: '', tax: '', discount: '' });
      setLines([]);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReceive = async () => {
    if (!receiveTarget) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/purchases/${receiveTarget.id}/receive`, { receivedAll: receiveAll });
      toast(t('receiveStock'), 'success');
      setReceiveTarget(null);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
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

  const cancelPurchase = async (p: Purchase) => {
    if (!window.confirm(`${t('cancel')}?`)) return;
    try {
      await apiClient.put(`/purchases/${p.id}/cancel`);
      toast(t('cancel'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <PageWrapper
      title={t('purchases')}
      description={t('purchases')}
      breadcrumb={['Owner', t('inventory'), t('purchases')]}
      actions={<button onClick={() => setCreateOpen(true)} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('addPurchase')}</button>}
    >
      {shopLoading || loading ? (
        <SkeletonTable rows={8} />
      ) : purchases.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('invoiceNo')}</th>
                <th className="px-4 py-3">{t('supplier')}</th>
                <th className="px-4 py-3">{t('date')}</th>
                <th className="px-4 py-3 text-right">{t('total')}</th>
                <th className="px-4 py-3 text-right">{t('paid')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('payment')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 font-medium text-foreground">{p.invoiceNo ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.supplier?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.total)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.amountPaid)}</td>
                  <td className="px-4 py-3"><Pill tone={statusTone[p.status] ?? 'gray'}>{p.status}</Pill></td>
                  <td className="px-4 py-3"><Pill tone={statusTone[p.paymentStatus] ?? 'gray'}>{p.paymentStatus}</Pill></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {(p.status === 'ORDERED' || p.status === 'PARTIALLY_RECEIVED') && (
                      <button onClick={() => { setReceiveTarget(p); setReceiveAll(true); }} className="text-xs font-medium text-secondary hover:underline inline-flex items-center gap-1 mr-3"><PackageCheck size={13} /> {t('receiveStock')}</button>
                    )}
                    {p.paymentStatus !== 'PAID' && p.status !== 'CANCELLED' && (
                      <button onClick={() => { setPayTarget(p); setPayForm({ amount: String(p.total - p.amountPaid), method: 'cash' }); }} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 mr-3"><Banknote size={13} /> {t('recordPayment')}</button>
                    )}
                    {(p.status === 'DRAFT' || p.status === 'ORDERED') && (
                      <button onClick={() => cancelPurchase(p)} className="text-xs font-medium text-danger hover:underline inline-flex items-center gap-1"><X size={13} /> {t('cancel')}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}

      {/* Create purchase */}
      <Modal open={createOpen} title={t('addPurchase')} onClose={() => setCreateOpen(false)} wide>
        <form onSubmit={submitCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('supplier')}</label>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="input-field">
                <option value="">—</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('invoiceNo')}</label>
              <input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} className="input-field" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">{t('items')}</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setScanOpen(true)} className="text-xs font-medium text-secondary hover:underline inline-flex items-center gap-1"><ScanBarcode size={13} /> {t('scan')}</button>
                <button type="button" onClick={addLine} className="text-xs font-medium text-secondary hover:underline">+ {t('add')}</button>
              </div>
            </div>
            {lines.length === 0 && <p className="text-xs text-subtle-foreground">{t('emptyCart')}</p>}
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <select className="input-field col-span-6" value={l.productId} onChange={(e) => setLines((prev) => prev.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))}>
                    <option value="">—</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" min={1} placeholder={t('quantity')} className="input-field col-span-2" value={l.quantity} onChange={(e) => setLines((prev) => prev.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                  <input type="number" min={0} placeholder={t('costPrice')} className="input-field col-span-3" value={l.unitCost} onChange={(e) => setLines((prev) => prev.map((x, j) => (j === i ? { ...x, unitCost: e.target.value } : x)))} />
                  <button type="button" onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} className="col-span-1 text-danger">×</button>
                </div>
              ))}
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

          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      {/* Receive stock */}
      <Modal open={!!receiveTarget} title={t('receiveStock')} onClose={() => setReceiveTarget(null)}>
        <p className="text-sm text-muted-foreground mb-4">{receiveTarget?.invoiceNo ?? ''} — {receiveTarget?.supplier?.name ?? ''}</p>
        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={receiveAll} onChange={(e) => setReceiveAll(e.target.checked)} />
          {t('all')} ({receiveTarget?.items?.length ?? 0} {t('items')})
        </label>
        <button onClick={submitReceive} disabled={submitting} className="btn-teal w-full">{submitting ? t('loading') : t('receiveStock')}</button>
      </Modal>

      {/* Pay purchase */}
      <Modal open={!!payTarget} title={t('recordPayment')} onClose={() => setPayTarget(null)}>
        <form onSubmit={submitPay} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('amount')}</label>
            <input required type="number" min={0} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('method')}</label>
            <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="input-field">
              <option value="cash">{t('cash')}</option>
              <option value="bank">{t('bank')}</option>
              <option value="mobile">{t('mobileMoney')}</option>
            </select>
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('save')}</button>
        </form>
      </Modal>

      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />
    </PageWrapper>
  );
}
