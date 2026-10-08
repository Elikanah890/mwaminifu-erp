'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { Shift } from '@/lib/types';
import { formatCurrency, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import Modal from '@/components/Modal';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Stagger, StaggerItem, motion } from '@/components/motion';
import { Clock, Lock, CheckCircle2 } from 'lucide-react';

type CloseResult = { shift: Shift; discrepancy: number };

export default function EmployeeShiftPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [opening, setOpening] = useState('');
  const [counted, setCounted] = useState('');
  const [result, setResult] = useState<CloseResult | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiClient.get<Shift>('/shifts/active'),
      apiClient.get<Shift[]>('/shifts'),
    ])
      .then(([a, h]) => {
        setActiveShift(a.data ?? null);
        setHistory(h.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/shifts', { openingCashBalance: Number(opening) || 0 });
      toast('Shift opened', 'success');
      setOpening('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const closeShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    setSubmitting(true);
    try {
      const res = await apiClient.put<{ shift: Shift; discrepancy: number }>(`/shifts/${activeShift.id}/close`, {
        countedCash: Number(counted),
      });
      setResult(res.data ?? null);
      setCounted('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper title={t('shifts')} description={t('currentShift')} breadcrumb={['Employee', t('shifts')]}>
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard rows={5} />
          <SkeletonCard rows={5} />
        </div>
      ) : (
        <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StaggerItem>
            <ChartWrapper title={activeShift ? t('closeShift') : t('openShift')} subtitle={activeShift ? t('countedCash') : t('openingBalance')}>
              {activeShift ? (
                <form onSubmit={closeShift} className="space-y-4">
                  <div className="bg-warning/10 border border-warning/25 rounded-lg p-3 text-sm text-warning flex items-start gap-2">
                    <Lock size={16} className="mt-0.5 shrink-0" />
                    <span>{t('countedCash')}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t('openingBalance')}</label>
                    <div className="text-lg font-bold text-primary">{formatCurrency(activeShift.openingCashBalance)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t('countedCash')}</label>
                    <input required type="number" min={0} value={counted} onChange={(e) => setCounted(e.target.value)} className="input-field" />
                  </div>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="btn-gold w-full inline-flex items-center justify-center gap-2"
                  >
                    <Clock size={16} /> {submitting ? t('loading') : t('closeShift')}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={openShift} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t('openingBalance')}</label>
                    <input required type="number" min={0} value={opening} onChange={(e) => setOpening(e.target.value)} className="input-field" />
                  </div>
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="btn-navy w-full inline-flex items-center justify-center gap-2"
                  >
                    <Clock size={16} /> {submitting ? t('loading') : t('openShift')}
                  </motion.button>
                </form>
              )}
            </ChartWrapper>
          </StaggerItem>

          <StaggerItem>
            <ChartWrapper title={t('history')} subtitle={t('shifts')}>
              {history.length === 0 ? (
                <EmptyState message={t('noData')} />
              ) : (
                <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                  {history.map((s) => (
                    <li key={s.id} className="py-3 rounded-lg px-2 transition-colors hover:bg-muted">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{formatDateTime(s.startedAt)}</span>
                        <Pill tone={s.isActive ? 'teal' : 'gray'}>{s.isActive ? t('open') : t('closed')}</Pill>
                      </div>
                      <div className="flex items-center justify-between text-xs text-subtle-foreground mt-1">
                        <span>{t('openingBalance')}: {formatCurrency(s.openingCashBalance)}</span>
                        {s.discrepancy != null && <span className={s.discrepancy === 0 ? 'text-secondary' : 'text-danger'}>{t('discrepancy')}: {formatCurrency(s.discrepancy)}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ChartWrapper>
          </StaggerItem>
        </Stagger>
      )}

      <Modal open={!!result} title={t('closeShift')} onClose={() => setResult(null)}>
        {result && (
          <div>
            <div className="text-center mb-4">
              <CheckCircle2 size={40} className="mx-auto text-secondary mb-2" />
              <p className="text-lg font-bold text-primary">{t('closeShift')}</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('openingBalance')}</span><span className="font-medium">{formatCurrency(result.shift.openingCashBalance)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('expectedCash')}</span><span className="font-medium">{formatCurrency(result.shift.expectedCash ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('countedCash')}</span><span className="font-medium">{formatCurrency(result.shift.countedCash ?? 0)}</span></div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">{t('discrepancy')}</span>
                <span className={`font-bold ${result.discrepancy === 0 ? 'text-secondary' : 'text-danger'}`}>{result.discrepancy === 0 ? '0' : formatCurrency(result.discrepancy)}</span>
              </div>
            </div>
            <button onClick={() => setResult(null)} className="btn-navy w-full mt-4">{t('close')}</button>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
