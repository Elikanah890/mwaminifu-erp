'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { usePermissions } from '@/lib/context/PermissionsContext';
import { EmployeeRow } from '@/lib/types';
import { formatDate, errorMessage } from '@/lib/format';
import { roleLabel } from '@/lib/i18n/labels';
import { permissionLabel, permissionDescription } from '@/lib/permissions/meta';
import PageWrapper from '@/components/PageWrapper';
import AccessDenied from '@/components/AccessDenied';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { ShieldCheck } from 'lucide-react';

export default function EmployeeEmployeesPage() {
  const { activeShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { can, loading: permsLoading } = usePermissions();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<EmployeeRow | null>(null);

  useEffect(() => {
    if (!activeShopId || !can('employees:view')) return;
    setLoading(true);
    apiClient.get<EmployeeRow[]>(`/shops/${activeShopId}/employees`)
      .then((res) => setEmployees(res.data ?? []))
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId, can]);

  if (permsLoading) return <PageWrapper title={t('employees')}><SkeletonTable rows={6} /></PageWrapper>;
  if (!can('employees:view')) return <PageWrapper title={t('employees')}><AccessDenied /></PageWrapper>;

  return (
    <PageWrapper title={t('employees')} description={t('employees')} breadcrumb={[t('employeePortal'), t('employees')]}>
      {shopLoading || loading ? (
        <SkeletonTable rows={6} />
      ) : employees.length === 0 ? (
        <Reveal><div className="surface-card"><EmptyState message={t('noData')} /></div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('name')}</th>
                <th className="px-4 py-3">{t('phone')}</th>
                <th className="px-4 py-3">{t('role')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('permissions')}</th>
                <th className="px-4 py-3">{t('date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-muted transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{e.user?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.user?.phone ?? e.user?.email ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{roleLabel(t, e.role)}</td>
                  <td className="px-4 py-3"><StatusBadge active={e.isActive} activeLabel={t('active')} inactiveLabel={t('inactive')} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDetail(e)} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline">
                      <ShieldCheck size={14} /> {e.permissions?.length ?? 0}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}

      <Modal open={!!detail} title={`${t('permissions')} — ${detail?.user?.name ?? ''}`} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-2 text-sm">
            {(detail.permissions ?? []).length === 0 ? (
              <EmptyState message={t('noData')} />
            ) : (
              detail.permissions.map((permission) => (
                <div key={permission} className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <p className="font-medium text-foreground">{permissionLabel(t, permission)}</p>
                  {permissionDescription(t, permission) && (
                    <p className="text-xs text-subtle-foreground">{permissionDescription(t, permission)}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
