'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { roleLabel } from '@/lib/i18n/labels';
import { ActivityLog, PaginationMeta } from '@/lib/types';
import { formatDateTime, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import PageWrapper from '@/components/PageWrapper';
import { Reveal, motion } from '@/components/motion';

const PER_PAGE = 15;

/** Historical labels kept readable after the email/password migration. */
function actionLabel(action: string): string {
  if (action === 'OWNER_PIN_RESET') return 'PASSWORD_RESET';
  return action.replace(/_/g, ' ');
}

const FINANCIAL_KEYS = /grandtotal|totalamount|amount|revenue|price|balance|payment|credit|discount|tax|cost|profit|unitprice/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (FINANCIAL_KEYS.test(k)) out[k] = '[hidden]';
      else out[k] = redact(v);
    }
    return out;
  }
  return value;
}

export default function ActivityLogsPage() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: PER_PAGE, total: 0 });
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<ActivityLog | null>(null);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      if (search.trim()) params.set('search', search.trim());
      if (action) params.set('action', action);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await apiClient.get<ActivityLog[]>(`/admin/activity-logs?${params.toString()}`);
      if (res.data) setLogs(res.data);
      if (res.pagination) setMeta(res.pagination);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, action, from, to]);

  useEffect(() => {
    load(1);
  }, [load]);

  const exportCsv = async () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (search.trim()) params.set('search', search.trim());
    if (action) params.set('action', action);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    try {
      await apiClient.download(`/admin/activity-logs?${params.toString()}`, `activity_logs_${Date.now()}.csv`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <PageWrapper title={t('activityLogsTitle')} description={t('activityLogsDesc')} breadcrumb={[t('systemOwner'), t('activityLogsTitle')]} actions={<motion.button onClick={exportCsv} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-outline">{t('csvExport')}</motion.button>}>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Reveal className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="input-field max-w-xs"
          placeholder={t('searchActivity')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); load(1); }}
        />
        <input className="input-field max-w-[240px]" placeholder={t('actionFilterExample')} value={action} onChange={(e) => { setAction(e.target.value); load(1); }} />
        <input type="date" className="input-field max-w-[160px]" value={from} onChange={(e) => { setFrom(e.target.value); load(1); }} />
        <input type="date" className="input-field max-w-[160px]" value={to} onChange={(e) => { setTo(e.target.value); load(1); }} />
      </Reveal>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} />
      ) : (
        <Reveal className="surface-card overflow-hidden">
          {logs.length === 0 ? (
            <EmptyState message={t('noActivityLogs')} />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 px-6 font-semibold">{t('date')}</th>
                  <th className="py-3 px-6 font-semibold">{t('action')}</th>
                  <th className="py-3 px-6 font-semibold">{t('actor')}</th>
                  <th className="py-3 px-6 font-semibold">{t('role')}</th>
                  <th className="py-3 px-6 font-semibold">{t('shop')}</th>
                  <th className="py-3 px-6 font-semibold">{t('ip')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-muted">
                    <td className="py-3 px-6 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                    <td className="py-3 px-6">
                      <button onClick={() => setDetail(log)} className="text-secondary font-medium hover:underline">
                        {actionLabel(log.action)}
                      </button>
                    </td>
                    <td className="py-3 px-6 text-foreground">{log.user?.name || t('systemLabel')}</td>
                    <td className="py-3 px-6 text-muted-foreground">{log.user?.role ? roleLabel(t, log.user.role) : '-'}</td>
                    <td className="py-3 px-6 text-muted-foreground">{log.shop?.name || '-'}</td>
                    <td className="py-3 px-6 text-subtle-foreground text-xs">{log.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          <div className="px-6 py-3 border-t border-border">
            <Pagination page={meta.page} total={meta.total} limit={PER_PAGE} onPageChange={load} />
          </div>
        </Reveal>
      )}

      <Modal open={!!detail} title={t('activityDetails')} onClose={() => setDetail(null)} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">{t('action')}</p><p className="font-semibold text-foreground">{actionLabel(detail.action)}</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">{t('time')}</p><p className="font-semibold text-foreground">{formatDateTime(detail.createdAt)}</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">{t('actor')}</p><p className="font-semibold text-foreground">{detail.user?.name || t('systemLabel')} ({detail.user?.role ? roleLabel(t, detail.user.role) : '-'})</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">{t('ipAgent')}</p><p className="font-semibold text-foreground truncate">{detail.ipAddress || '-'} {detail.userAgent ? `· ${detail.userAgent}` : ''}</p></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('details')}</p>
              <pre className="bg-muted border border-border rounded-lg p-4 text-xs text-foreground whitespace-pre-wrap break-all overflow-auto max-h-64">
                {JSON.stringify(redact(detail.details || {}), null, 2)}
              </pre>
            </div>
            <button onClick={() => setDetail(null)} className="btn-outline w-full">{t('close')}</button>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}