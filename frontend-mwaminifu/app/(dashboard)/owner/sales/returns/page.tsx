'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Refund, SaleListItem } from '@/lib/types';
import { formatCurrency, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { RotateCcw, Check, X, Plus } from 'lucide-react';

const statusTone: Record<string, 'green' | 'amber' | 'red' | 'gray' | 'teal'> = {
  COMPLETED: 'green',
  APPROVED: 'teal',
  PENDING: 'amber',
  REJECTED: 'red',
};

type RefundLine = { productId: string; quantity: number };

export default function ReturnsPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [saleTarget, setSaleTarget] = useState<SaleListItem | null>(null);
  const [saleDetail, setSaleDetail] = useState<SaleListItem | null>(null);
  const [refundLines, setRefundLines] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    const q = status ? `&status=${encodeURIComponent(status)}` : '';
    apiClient.get<Refund[]>(`/shops/${activeShopId}/refunds?limit=200${q}`)
      .then((res) => setRefunds(res.data ?? []))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load();   }, [activeShopId, status]);

  const openCreate = () => {
    setCreateOpen(true);
    setSaleTarget(null);
    setSaleDetail(null);
    setRefundLines({});
    setReason('');
    if (!activeShopId) return;
    apiClient.get<SaleListItem[]>(`/shops/${activeShopId}/sales?limit=200&status=COMPLETED`)
      .then((res) => setSales(res.data ?? []))
      .catch(() => setSales([]));
  };

  const selectSale = async (s: SaleListItem) => {
    setSaleTarget(s);
    setRefundLines({});
    try {
      const res = await apiClient.get<SaleListItem>(`/sales/${s.id}`);
      setSaleDetail(res.data ?? s);
    } catch {
      setSaleDetail(s);
    }
  };

  const refundAmount = useMemo(() => {
    if (!saleDetail?.items) return 0;
    return saleDetail.items.reduce((sum, i) => {
      const key = i.id ?? i.product?.name ?? '';
      const q = refundLines[key] ?? 0;
      return sum + q * i.unitPrice;
    }, 0);
  }, [saleDetail, refundLines]);

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleTarget || !reason.trim() || !saleDetail?.items) return;
    const items: RefundLine[] = saleDetail.items
      .filter((i) => (refundLines[i.id ?? i.product?.name ?? ''] ?? 0) > 0)
      .map((i) => ({
        productId: i.productId ?? i.id ?? '',
        quantity: refundLines[i.id ?? i.product?.name ?? ''] ?? 0,
      }));
    if (items.length === 0) {
      toast(t('itemsToRefund'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.put(`/sales/${saleTarget.id}/refund`, { reason, items });
      toast(t('returns'), 'success');
      setCreateOpen(false);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const setRefundStatus = async (r: Refund, next: 'APPROVED' | 'REJECTED') => {
    setSubmitting(true);
    try {
      await apiClient.put(`/refunds/${r.id}/status`, { status: next });
      toast(next === 'APPROVED' ? t('approveRefund') : t('rejectRefund'), 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper
      title={t('returns')}
      description={t('returns')}
      breadcrumb={['Owner', t('sales'), t('returns')]}
      actions={
        <div className="flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field max-w-[180px]">
            <option value="">{t('all')}</option>
            {['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <button onClick={openCreate} className="btn-navy inline-flex items-center gap-2"><Plus size={16} /> {t('requestRefund')}</button>
        </div>
      }
    >
      {shopLoading || loading ? (
        <SkeletonTable rows={8} />
      ) : refunds.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('returnId')}</th>
                <th className="px-4 py-3">{t('originalInvoice')}</th>
                <th className="px-4 py-3">{t('customer')}</th>
                <th className="px-4 py-3">{t('date')}</th>
                <th className="px-4 py-3">{t('items')}</th>
                <th className="px-4 py-3 text-right">{t('refundAmount')}</th>
                <th className="px-4 py-3">{t('reason')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('approvedBy')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {refunds.map((r) => (
                <tr key={r.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 font-medium text-foreground">{r.refundNumber ?? r.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.sale?.receiptNumber ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.customer?.name ?? t('walkInCustomer')}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.items.length}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{r.reason ?? '-'}</td>
                  <td className="px-4 py-3"><Pill tone={statusTone[r.status] ?? 'gray'}>{r.status}</Pill></td>
                  <td className="px-4 py-3 text-muted-foreground">{r.user?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {r.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setRefundStatus(r, 'APPROVED')} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"><Check size={13} /> {t('approve')}</button>
                        <button onClick={() => setRefundStatus(r, 'REJECTED')} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"><X size={13} /> {t('reject')}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}

      <Modal open={createOpen} title={t('requestRefund')} onClose={() => setCreateOpen(false)} wide>
        {!saleTarget ? (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {sales.length === 0 ? <EmptyState message={t('noData')} /> : sales.map((s) => (
              <button key={s.id} onClick={() => selectSale(s)} className="w-full flex items-center justify-between border border-border rounded-lg p-3 hover:border-secondary text-left">
                <span className="text-sm font-medium text-foreground">{s.receiptNumber ?? '-'}</span>
                <span className="text-sm text-muted-foreground">{formatDateTime(s.saleDate)}</span>
                <span className="text-sm font-semibold text-secondary">{formatCurrency(s.grandTotal)}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={submitRefund} className="space-y-4">
            <div className="flex items-center justify-between bg-muted rounded-lg p-3">
              <span className="text-sm text-muted-foreground">{saleTarget.receiptNumber ?? '-'}</span>
              <span className="text-sm font-semibold text-foreground">{formatCurrency(saleTarget.grandTotal)}</span>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {saleDetail?.items?.map((i) => {
                const key = i.id ?? i.product?.name ?? '';
                const qty = refundLines[key] ?? 0;
                return (
                  <div key={key} className="flex items-center justify-between border-b border-border py-2">
                    <div>
                      <p className="text-sm text-foreground">{i.product?.name ?? 'Item'}</p>
                      <p className="text-xs text-subtle-foreground">{formatCurrency(i.unitPrice)} × {i.quantity}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={i.quantity}
                      value={qty}
                      onChange={(e) => setRefundLines((prev) => ({ ...prev, [key]: Math.min(i.quantity, Math.max(0, Number(e.target.value) || 0)) }))}
                      className="w-24 px-2 py-1 border border-border-strong rounded-md text-sm text-right"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('refundAmount')}</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(refundAmount)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('reason')}</label>
              <input required value={reason} onChange={(e) => setReason(e.target.value)} className="input-field" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSaleTarget(null)} className="btn-outline flex-1">{t('back')}</button>
              <button type="submit" disabled={submitting} className="btn-navy flex-1 inline-flex items-center justify-center gap-2"><RotateCcw size={16} /> {submitting ? t('loading') : t('submit')}</button>
            </div>
          </form>
        )}
      </Modal>
    </PageWrapper>
  );
}
