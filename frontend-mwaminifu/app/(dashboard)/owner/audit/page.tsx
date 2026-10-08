'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { AuditLogEntry } from '@/lib/types';
import { formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Search, Download, Trash2, Archive } from 'lucide-react';

const ACTIONS = [
  'SALE_CREATED', 'SALE_VOIDED', 'SALE_REFUNDED', 'REFUND_CREATED', 'REFUND_APPROVED', 'REFUND_REJECTED',
  'PURCHASE_CREATED', 'PURCHASE_RECEIVED', 'PURCHASE_PAYMENT', 'PURCHASE_CANCELLED',
  'CASH_TRANSACTION', 'CASH_REVERSAL', 'EXPENSE_CREATED', 'EXPENSE_APPROVED', 'EXPENSE_REJECTED',
  'PAYMENT_RECORDED', 'CREDIT_WRITE_OFF', 'LOAN_CREATED', 'LOAN_REPAYMENT', 'CUSTOMER_CREATED',
  'STOCK_ADJUSTED', 'PRODUCT_UPDATED',
];

const actionTone = (action: string): 'red' | 'amber' | 'green' | 'navy' | 'gray' => {
  if (action.includes('VOID') || action.includes('REJECT') || action.includes('REVERSAL')) return 'red';
  if (action.includes('APPROVE') || action.includes('CREATED') || action.includes('RECORDED')) return 'green';
  if (action.includes('REFUND') || action.includes('ADJUST')) return 'amber';
  return 'navy';
};

export default function AuditLogPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<AuditLogEntry | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    const q = new URLSearchParams();
    if (action) q.set('action', action);
    if (search) q.set('search', search);
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    apiClient.get<AuditLogEntry[]>(`/shops/${activeShopId}/audit-logs?limit=200${qs ? `&${qs}` : ''}`)
      .then((res) => setLogs(res.data ?? []))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, action, search, from, to]);

  const allSelected = useMemo(() => logs.length > 0 && logs.every((l) => selected.has(l.id)), [logs, selected]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(logs.map((l) => l.id)));
  };

  const exportCsv = () => {
    if (!activeShopId) return;
    const q = new URLSearchParams();
    if (action) q.set('action', action);
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    apiClient.download(`/shops/${activeShopId}/audit-logs/export${qs ? `?${qs}` : ''}`, 'audit-log.csv');
  };

  const confirmIndividual = async () => {
    if (!deleteTarget || !reason.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/shops/${activeShopId}/audit-logs/${deleteTarget.id}`, { reason });
      toast(t('archive'), 'success');
      setDeleteTarget(null);
      setReason('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmBulk = async () => {
    if (selected.size === 0 || !reason.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/shops/${activeShopId}/audit-logs/bulk-delete`, { ids: Array.from(selected), reason });
      toast(t('archive'), 'success');
      setBulkOpen(false);
      setSelected(new Set());
      setReason('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper
      title={t('auditLog')}
      description={t('auditLog')}
      breadcrumb={['Owner', t('auditLog')]}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="btn-outline inline-flex items-center gap-2 text-sm"><Download size={16} /> {t('csvExport')}</button>
          {selected.size > 0 && (
            <button onClick={() => { setReason(''); setBulkOpen(true); }} className="btn-outline inline-flex items-center gap-2 text-sm text-danger"><Archive size={16} /> {t('archive')} ({selected.size})</button>
          )}
        </div>
      }
    >
      <Reveal className="surface-card p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className="input-field pl-9" />
        </div>
        <select value={action} onChange={(e) => setAction(e.target.value)} className="input-field">
          <option value="">{t('all')}</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field" />
      </Reveal>

      {shopLoading || loading ? (
        <SkeletonTable rows={8} />
      ) : logs.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3 w-8"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th className="px-4 py-3">{t('date')}</th>
                <th className="px-4 py-3">{t('action')}</th>
                <th className="px-4 py-3">{t('entity')}</th>
                <th className="px-4 py-3">{t('details')}</th>
                <th className="px-4 py-3">{t('employees')}</th>
                <th className="px-4 py-3">{t('device')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-muted transition-colors">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} /></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3"><Pill tone={actionTone(l.action)}>{l.action}</Pill></td>
                  <td className="px-4 py-3 text-muted-foreground">{l.entity ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[320px] truncate">{JSON.stringify(l.newValue ?? l.oldValue ?? {})}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.user?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{l.ipAddress ?? l.userAgent ?? '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setDeleteTarget(l); setReason(''); }} className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"><Trash2 size={14} /> {t('archive')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}

      <Modal open={!!deleteTarget} title={t('archive')} onClose={() => setDeleteTarget(null)}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('action')}: {deleteTarget?.action}</p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('reason')}</label>
            <input required value={reason} onChange={(e) => setReason(e.target.value)} className="input-field" />
          </div>
          <button onClick={confirmIndividual} disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('confirm')}</button>
        </div>
      </Modal>

      <Modal open={bulkOpen} title={`${t('archive')} ${selected.size}`} onClose={() => setBulkOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{selected.size} {t('auditLog')}</p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('reason')}</label>
            <input required value={reason} onChange={(e) => setReason(e.target.value)} className="input-field" />
          </div>
          <button onClick={confirmBulk} disabled={submitting} className="btn-navy w-full">{submitting ? t('loading') : t('confirm')}</button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
