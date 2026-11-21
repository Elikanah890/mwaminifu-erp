'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { Shift } from '@/lib/types';
import { formatCurrency, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import { Pill } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { AlertTriangle, Clock, Plus } from 'lucide-react';
import Modal from '@/components/Modal';
import { usePermissions } from '@/lib/context/PermissionsContext';

type ShiftWithUser = Shift & { user?: { id: string; name: string } };

export default function ShiftsPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const { can } = usePermissions();
  const [shifts, setShifts] = useState<ShiftWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [opening, setOpening] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    apiClient.get<ShiftWithUser[]>(`/shops/${activeShopId}/shifts`)
      .then((res) => setShifts(res.data ?? []))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId]);

  const openShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShopId) return;
    setSubmitting(true);
    try {
      await apiClient.post('/shifts', { shopId: activeShopId, openingCashBalance: Number(opening) || 0 });
      toast(t('openShift'), 'success');
      setOpenModal(false);
      setOpening('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (shopLoading || loading) return <PageWrapper title={t('shifts')}><SkeletonTable rows={6} /></PageWrapper>;

  return (
    <PageWrapper title={t('shifts')} description={t('shifts')} breadcrumb={[t('businessOwner'), t('people'), t('shifts')]}>
      {shifts.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState
          icon={<Clock size={22} />}
          title={t('noShiftsYet')}
          description={t('noShiftsDesc')}
          action={can('shift:open') ? (
            <button onClick={() => setOpenModal(true)} className="btn-navy inline-flex items-center gap-2">
              <Plus size={16} /> {t('openShift')}
            </button>
          ) : undefined}
        /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('employees')}</th>
                <th className="px-4 py-3">{t('openingBalance')}</th>
                <th className="px-4 py-3 text-right">{t('expectedCash')}</th>
                <th className="px-4 py-3 text-right">{t('countedCash')}</th>
                <th className="px-4 py-3 text-right">{t('discrepancy')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 font-medium text-foreground">{s.user?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCurrency(s.openingCashBalance)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(s.expectedCash ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{s.countedCash != null ? formatCurrency(s.countedCash) : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {s.discrepancy != null && s.discrepancy !== 0 ? (
                      <span className="inline-flex items-center gap-1 text-danger font-semibold"><AlertTriangle size={13} /> {formatCurrency(s.discrepancy)}</span>
                    ) : (
                      <span className="text-subtle-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Pill tone={s.isActive ? 'green' : 'gray'}>{s.isActive ? t('open') : t('closed')}</Pill></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(s.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}
      <Modal open={openModal} title={t('openShift')} onClose={() => setOpenModal(false)}>
        <form onSubmit={openShift} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('openingBalance')}</label>
            <input required type="number" min={0} value={opening} onChange={(e) => setOpening(e.target.value)} className="input-field" />
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">
            {submitting ? t('loading') : t('openShift')}
          </button>
        </form>
      </Modal>
    </PageWrapper>
  );
}
