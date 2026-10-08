'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { SaleListItem } from '@/lib/types';
import { formatCurrency, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Search, Printer, FileText, RotateCcw, X } from 'lucide-react';

const statusTone: Record<string, 'green' | 'amber' | 'red' | 'gray'> = { COMPLETED: 'green', SUSPENDED: 'amber', REFUNDED: 'red', VOIDED: 'gray' };

type Receipt = {
  receiptNumber?: string;
  saleDate: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  paymentDetails: Array<{ method: string; amount: number }>;
  items: Array<{ id: string; quantity: number; unitPrice: number; total: number; unit?: string | null; product: { name: string } }>;
  shop?: { name: string; address?: string | null; receiptHeader?: string | null; receiptFooter?: string | null };
  user?: { name: string };
};

export default function SalesHistoryPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [voidTarget, setVoidTarget] = useState<SaleListItem | null>(null);
  const [refundTarget, setRefundTarget] = useState<SaleListItem | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeShopId) return;
    setLoading(true);
    const q = status ? `&status=${status}` : '';
    apiClient.get<SaleListItem[]>(`/shops/${activeShopId}/sales?limit=200${q}`)
      .then((res) => setSales(res.data ?? []))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [activeShopId, status]);

  const filtered = search ? sales.filter((s) => (s.receiptNumber ?? '').toLowerCase().includes(search.toLowerCase()) || (s.customer?.name ?? '').toLowerCase().includes(search.toLowerCase())) : sales;

  const openReceipt = async (s: SaleListItem) => {
    if (!s.receiptNumber) return;
    setReceipt(null);
    setReceiptLoading(true);
    try {
      const res = await apiClient.get<Receipt>(`/sales/receipt/${s.receiptNumber}`);
      setReceipt(res.data ?? null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setReceiptLoading(false);
    }
  };

  const printReceipt = () => {
    const r = receipt;
    if (!r) return;
    const lines = [
      r.shop?.receiptHeader ?? '',
      r.shop?.name ?? '',
      r.shop?.address ?? '',
      '--------------------------------',
      `Receipt: ${r.receiptNumber ?? ''}`,
      `Date: ${formatDateTime(r.saleDate)}`,
      `Cashier: ${r.user?.name ?? ''}`,
      '--------------------------------',
      ...r.items.map((i) => `${i.product.name} x${i.quantity} @${formatCurrency(i.unitPrice)} = ${formatCurrency(i.total)}`),
      '--------------------------------',
      `Total: ${formatCurrency(r.totalAmount)}`,
      `Discount: ${formatCurrency(r.discount)}`,
      `Tax: ${formatCurrency(r.taxAmount)}`,
      `Grand Total: ${formatCurrency(r.grandTotal)}`,
      ...(r.paymentDetails ?? []).map((p) => `${p.method}: ${formatCurrency(p.amount)}`),
      '--------------------------------',
      r.shop?.receiptFooter ?? '',
      'Mwaminifu',
    ];
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<pre style="font-family: monospace; font-size: 12px; white-space: pre-wrap;">${lines.join('\n')}</pre>`);
    w.document.title = 'Receipt';
    w.print();
  };

  const shareWhatsApp = () => {
    const r = receipt;
    if (!r) return;
    const items = r.items.map((i) => `${i.product.name} x${i.quantity} = ${formatCurrency(i.total)}`).join('\n');
    const text = `*${r.shop?.name ?? ''}*\n${t('receipt')}: ${r.receiptNumber ?? ''}\n${items}\n*${t('grandTotal')}: ${formatCurrency(r.grandTotal)}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    const r = receipt;
    if (!r) return;
    const items = r.items.map((i) => `${i.product.name} x${i.quantity} = ${formatCurrency(i.total)}`).join('\n');
    const subject = `${t('receipt')} ${r.receiptNumber ?? ''}`;
    const body = `${r.shop?.name ?? ''}\n${t('receipt')}: ${r.receiptNumber ?? ''}\n${items}\n${t('grandTotal')}: ${formatCurrency(r.grandTotal)}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const reload = () => {
    if (!activeShopId) return;
    const q = status ? `&status=${status}` : '';
    apiClient.get<SaleListItem[]>(`/shops/${activeShopId}/sales?limit=200${q}`)
      .then((res) => setSales(res.data ?? []))
      .catch((err) => toast(errorMessage(err), 'error'));
  };

  const confirmVoid = async () => {
    if (!voidTarget || !reason.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/sales/${voidTarget.id}/void`, { reason });
      toast(t('voidSale'), 'success');
      setVoidTarget(null);
      setReason('');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRefund = async () => {
    if (!refundTarget || !reason.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/sales/${refundTarget.id}/refund`, { reason });
      toast(t('returns'), 'success');
      setRefundTarget(null);
      setReason('');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper
      title={t('salesHistory')}
      description={t('salesHistory')}
      breadcrumb={['Owner', t('sales'), t('salesHistory')]}
      actions={
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field max-w-[180px]">
          <option value="">{t('all')}</option>
          {['COMPLETED', 'SUSPENDED', 'REFUNDED', 'VOIDED'].map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      }
    >
      <Reveal className="mb-6"><div className="surface-card p-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className="input-field pl-9" />
        </div>
      </div></Reveal>

      {shopLoading || loading ? (
        <SkeletonTable rows={8} />
      ) : filtered.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('receipt')}</th>
                <th className="px-4 py-3">{t('date')}</th>
                <th className="px-4 py-3">{t('customer')}</th>
                <th className="px-4 py-3">{t('paymentMethod')}</th>
                <th className="px-4 py-3 text-right">{t('total')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 font-medium text-foreground">{s.receiptNumber ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(s.saleDate)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.customer?.name ?? t('walkInCustomer')}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{s.paymentMethod ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(s.grandTotal)}</td>
                  <td className="px-4 py-3"><Pill tone={statusTone[s.status] ?? 'gray'}>{s.status}</Pill></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openReceipt(s)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><FileText size={14} /> {t('receipt')}</button>
                      {s.status === 'COMPLETED' && (
                        <>
                          <button onClick={() => { setRefundTarget(s); setReason(''); }} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"><RotateCcw size={14} /> {t('returns')}</button>
                          <button onClick={() => { setVoidTarget(s); setReason(''); }} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"><X size={14} /> {t('voidSale')}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}

      <Modal open={!!receipt || receiptLoading} title={t('receipt')} onClose={() => setReceipt(null)}>
        {receiptLoading ? (
          <SkeletonCard rows={5} />
        ) : receipt ? (
          <div>
            <div className="text-center mb-4">
              {receipt.shop?.receiptHeader && <p className="text-xs text-muted-foreground">{receipt.shop.receiptHeader}</p>}
              <p className="font-bold text-primary">{receipt.shop?.name ?? ''}</p>
              {receipt.shop?.address && <p className="text-xs text-muted-foreground">{receipt.shop.address}</p>}
              <p className="text-xs text-subtle-foreground mt-1">{receipt.receiptNumber} · {formatDateTime(receipt.saleDate)}</p>
            </div>
            <div className="border-t border-border py-2 space-y-1">
              {receipt.items.map((i) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="text-foreground">{i.product.name} × {i.quantity}</span>
                  <span className="text-muted-foreground">{formatCurrency(i.total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border py-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('subtotal')}</span><span>{formatCurrency(receipt.totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('discount')}</span><span>{formatCurrency(receipt.discount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tax')}</span><span>{formatCurrency(receipt.taxAmount)}</span></div>
              <div className="flex justify-between font-bold text-primary"><span>{t('grandTotal')}</span><span>{formatCurrency(receipt.grandTotal)}</span></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={printReceipt} className="btn-navy flex-1 inline-flex items-center justify-center gap-2"><Printer size={16} /> {t('print')}</button>
              <button onClick={shareWhatsApp} className="btn-teal flex-1">{t('shareWhatsApp')}</button>
              <button onClick={shareEmail} className="btn-outline flex-1">{t('email')}</button>
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal open={!!voidTarget} title={t('voidSale')} onClose={() => setVoidTarget(null)}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{voidTarget?.receiptNumber ?? ''} — {formatCurrency(voidTarget?.grandTotal ?? 0)}</p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('reason')}</label>
            <input required value={reason} onChange={(e) => setReason(e.target.value)} className="input-field" />
          </div>
          <button onClick={confirmVoid} disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('confirm')}</button>
        </div>
      </Modal>

      <Modal open={!!refundTarget} title={t('returns')} onClose={() => setRefundTarget(null)}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{refundTarget?.receiptNumber ?? ''} — {formatCurrency(refundTarget?.grandTotal ?? 0)}</p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('reason')}</label>
            <input required value={reason} onChange={(e) => setReason(e.target.value)} className="input-field" />
          </div>
          <button onClick={confirmRefund} disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('confirm')}</button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
