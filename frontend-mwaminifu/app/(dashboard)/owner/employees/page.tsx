'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { EmployeeRow, SaleListItem } from '@/lib/types';
import { formatDate, formatCurrency, formatDateTime, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { Plus, KeyRound, ShieldCheck, Activity } from 'lucide-react';

// Spec 9.8.1 — reporting is split into individually-grantable permissions.
// General Reports and Finance Overview are OWNER-ONLY and intentionally absent
// here (they can never be granted to an employee).
// Canonical grantable permissions (matches backend config/permissions.ts).
// Labels and descriptions are localization keys: the selected app language
// controls the text while the permission identifiers stay unchanged.
const PERMISSION_GROUPS: Array<{
  title: string;
  items: Array<{ id: string; labelKey: string; descKey: string }>;
}> = [
  { title: 'sales', items: [
    { id: 'sales:create', labelKey: 'permSalesCreate', descKey: 'permSalesCreateDesc' },
    { id: 'sales:view', labelKey: 'permSalesView', descKey: 'permSalesViewDesc' },
    { id: 'sales:refund', labelKey: 'permSalesRefund', descKey: 'permSalesRefundDesc' },
    { id: 'sales:cancel', labelKey: 'permSalesCancel', descKey: 'permSalesCancelDesc' },
  ] },
  { title: 'productsInventory', items: [
    { id: 'products:view', labelKey: 'permProductsView', descKey: 'permProductsViewDesc' },
    { id: 'products:create', labelKey: 'permProductsCreate', descKey: 'permProductsCreateDesc' },
    { id: 'products:update', labelKey: 'permProductsUpdate', descKey: 'permProductsUpdateDesc' },
    { id: 'products:delete', labelKey: 'permProductsDelete', descKey: 'permProductsDeleteDesc' },
    { id: 'inventory:view', labelKey: 'permInventoryView', descKey: 'permInventoryViewDesc' },
    { id: 'inventory:adjust', labelKey: 'permInventoryAdjust', descKey: 'permInventoryAdjustDesc' },
  ] },
  { title: 'customersCredit', items: [
    { id: 'customers:view', labelKey: 'permCustomersView', descKey: 'permCustomersViewDesc' },
    { id: 'customers:create', labelKey: 'permCustomersCreate', descKey: 'permCustomersCreateDesc' },
    { id: 'customers:update', labelKey: 'permCustomersUpdate', descKey: 'permCustomersUpdateDesc' },
    { id: 'credit:create', labelKey: 'permCreditCreate', descKey: 'permCreditCreateDesc' },
    { id: 'credit:collect', labelKey: 'permCreditCollect', descKey: 'permCreditCollectDesc' },
    { id: 'credit:read', labelKey: 'permCreditRead', descKey: 'permCreditReadDesc' },
    { id: 'credit:writeoff', labelKey: 'permCreditWriteoff', descKey: 'permCreditWriteoffDesc' },
  ] },
  { title: 'expensesPurchases', items: [
    { id: 'expenses:create', labelKey: 'permExpensesCreate', descKey: 'permExpensesCreateDesc' },
    { id: 'expenses:read', labelKey: 'permExpensesRead', descKey: 'permExpensesReadDesc' },
    { id: 'expenses:approve', labelKey: 'permExpensesApprove', descKey: 'permExpensesApproveDesc' },
    { id: 'purchases:view', labelKey: 'permPurchasesView', descKey: 'permPurchasesViewDesc' },
    { id: 'purchases:create', labelKey: 'permPurchasesCreate', descKey: 'permPurchasesCreateDesc' },
    { id: 'purchases:approve', labelKey: 'permPurchasesApprove', descKey: 'permPurchasesApproveDesc' },
  ] },
  { title: 'shifts', items: [
    { id: 'shift:open', labelKey: 'permShiftOpen', descKey: 'permShiftOpenDesc' },
    { id: 'shift:close', labelKey: 'permShiftClose', descKey: 'permShiftCloseDesc' },
    { id: 'shift:view', labelKey: 'permShiftView', descKey: 'permShiftViewDesc' },
  ] },
  { title: 'reports', items: [
    { id: 'reports:sales', labelKey: 'permReportsSales', descKey: 'permReportsSalesDesc' },
    { id: 'reports:inventory', labelKey: 'permReportsInventory', descKey: 'permReportsInventoryDesc' },
    { id: 'reports:credit', labelKey: 'permReportsCredit', descKey: 'permReportsCreditDesc' },
    { id: 'reports:activity_log', labelKey: 'permReportsActivityLog', descKey: 'permReportsActivityLogDesc' },
    { id: 'reports:loans', labelKey: 'permReportsLoans', descKey: 'permReportsLoansDesc' },
    { id: 'reports:valuation', labelKey: 'permReportsValuation', descKey: 'permReportsValuationDesc' },
    { id: 'reports:communications', labelKey: 'permReportsCommunications', descKey: 'permReportsCommunicationsDesc' },
  ] },
  { title: 'financialControls', items: [
    { id: 'loans:read', labelKey: 'permLoansRead', descKey: 'permLoansReadDesc' },
    { id: 'loans:write', labelKey: 'permLoansWrite', descKey: 'permLoansWriteDesc' },
    { id: 'cash:read', labelKey: 'permCashRead', descKey: 'permCashReadDesc' },
    { id: 'cash:write', labelKey: 'permCashWrite', descKey: 'permCashWriteDesc' },
    { id: 'finance:read', labelKey: 'permFinanceRead', descKey: 'permFinanceReadDesc' },
  ] },
  { title: 'staff', items: [
    { id: 'employees:view', labelKey: 'permEmployeesView', descKey: 'permEmployeesViewDesc' },
  ] },
];

// Canonical default for a new full-operational employee (mirrors the backend
// FULL_OPERATIONAL_PERMISSIONS). Never send legacy strings like "pos:write" —
// the backend rejects unknown/non-grantable permissions.
const DEFAULT_EMPLOYEE_PERMISSIONS = [
  'sales:create', 'sales:view', 'sales:refund',
  'products:view', 'products:create', 'products:update', 'products:delete',
  'inventory:view', 'inventory:adjust',
  'customers:view', 'customers:create', 'customers:update',
  'credit:create', 'credit:collect',
  'expenses:create',
  'reports:sales', 'reports:inventory', 'reports:credit',
  'shift:open', 'shift:close', 'shift:view',
];

export default function OwnerEmployeesPage() {
  const { activeShopId, shops, setActiveShopId, loading: shopLoading } = useShop();
  const { t } = useI18n();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [permTarget, setPermTarget] = useState<EmployeeRow | null>(null);
  const [activityTarget, setActivityTarget] = useState<EmployeeRow | null>(null);
  const [activitySales, setActivitySales] = useState<SaleListItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Cashier', shopId: '' });
  const [credentials, setCredentials] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>(DEFAULT_EMPLOYEE_PERMISSIONS);

  const load = () => {
    if (!activeShopId) return;
    setLoading(true);
    apiClient
      .get<EmployeeRow[]>(`/shops/${activeShopId}/employees`)
      .then((res) => setEmployees(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const targetShopId = form.shopId || activeShopId;
    if (!targetShopId) {
      toast('Select a shop first', 'error');
      setSubmitting(false);
      return;
    }
    try {
      const res = await apiClient.post<{ tempPassword?: string }>(`/shops/${targetShopId}/employees`, {
        name: form.name,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        permissions: selectedPerms,
      });
      toast(
        res.data?.tempPassword
          ? 'Employee added. Welcome email sent.'
          : 'Employee assigned to this shop. Their existing password was not changed.',
        'success'
      );
      if (res.data?.tempPassword) {
        setCredentials({ name: form.name, email: form.email.trim().toLowerCase(), tempPassword: res.data.tempPassword });
      }
      setAddOpen(false);
      setForm({ name: '', email: '', phone: '', role: 'Cashier', shopId: '' });
      setSelectedPerms(DEFAULT_EMPLOYEE_PERMISSIONS);
      if (targetShopId !== activeShopId) setActiveShopId(targetShopId);
      else load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const savePermissions = async () => {
    if (!permTarget) return;
    setSubmitting(true);
    try {
      await apiClient.put(`/employees/${permTarget.id}/permissions`, { permissions: selectedPerms });
      toast('Permissions updated', 'success');
      setPermTarget(null);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (emp: EmployeeRow) => {
    setSubmitting(true);
    try {
      const res = await apiClient.post<{ tempPassword?: string }>(`/employees/${emp.id}/reset-password`);
      toast('Password reset. Email sent.', 'success');
      if (res.data?.tempPassword && emp.user) {
        setCredentials({ name: emp.user.name, email: emp.user.email ?? '', tempPassword: res.data.tempPassword });
      }
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openActivity = async (emp: EmployeeRow) => {
    if (!emp.user?.id || !activeShopId) return;
    setActivityTarget(emp);
    setActivitySales([]);
    setActivityLoading(true);
    try {
      const res = await apiClient.get<SaleListItem[]>(`/shops/${activeShopId}/sales?userId=${emp.user.id}&limit=20`);
      setActivitySales(res.data ?? []);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setActivityLoading(false);
    }
  };

  return (
    <PageWrapper
      title={t('employees')}
      description={t('employees')}
      breadcrumb={[t('businessOwner'), t('people'), t('employees')]}
      actions={
        <button onClick={() => { setAddOpen(true); setSelectedPerms(DEFAULT_EMPLOYEE_PERMISSIONS); setForm((prev) => ({ ...prev, shopId: activeShopId ?? shops[0]?.id ?? '' })); }} className="btn-navy inline-flex items-center gap-2">
          <Plus size={16} /> {t('add')}
        </button>
      }
    >
      {shopLoading || loading ? (
        <SkeletonTable rows={8} />
      ) : employees.length === 0 ? (
        <Reveal><div className="surface-card">
          <EmptyState message={t('noData')} />
        </div></Reveal>
      ) : (
        <Reveal><div className="surface-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-3">{t('name')}</th>
                <th className="px-4 py-3">{t('phone')}</th>
                <th className="px-4 py-3">{t('role')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('date')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-muted transition-colors hover:shadow-[inset_3px_0_0_var(--secondary)]">
                  <td className="px-4 py-3 font-medium text-foreground">{e.user?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.user?.email ?? e.user?.phone ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.role}</td>
                  <td className="px-4 py-3"><StatusBadge active={e.isActive} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(e.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => { setPermTarget(e); setSelectedPerms(e.permissions ?? []); }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <ShieldCheck size={14} /> {t('permissions')}
                      </button>
                      <button onClick={() => resetPassword(e)} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline">
                        <KeyRound size={14} /> Reset password
                      </button>
                      <button onClick={() => openActivity(e)} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:underline">
                        <Activity size={14} /> {t('activity')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></Reveal>
      )}

      <Modal open={addOpen} title="Add Employee" onClose={() => setAddOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Assign to shop <span className="text-danger">*</span></label>
            <select required value={form.shopId} onChange={(e) => setForm({ ...form, shopId: e.target.value })} className="input-field">
              <option value="">Select shop</option>
              {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email <span className="text-danger">*</span></label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="employee@example.com" />
            <p className="mt-1 text-xs text-subtle-foreground">Login credentials will be emailed here.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone (optional)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="e.g. 0754111111" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
              <option value="Cashier">Cashier</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('permissions')}</label>
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t(group.title)}</p>
                  <div className="space-y-2">
                    {group.items.map((p) => (
                      <label key={p.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded" />
                        <span className="min-w-0">
                          <span className="block">{t(p.labelKey)}</span>
                          <span className="block text-xs text-subtle-foreground">{t(p.descKey)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-navy w-full">
            {submitting ? 'Adding...' : 'Add Employee'}
          </button>
        </form>
      </Modal>

      <Modal open={!!permTarget} title={`${t('permissions')} — ${permTarget?.user?.name ?? ''}`} onClose={() => setPermTarget(null)}>
        <div className="space-y-4 mb-4">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{t(group.title)}</p>
              <div className="space-y-2">
              {group.items.map((p) => (
                <label key={p.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded" />
                  <span className="min-w-0">
                    <span className="block">{t(p.labelKey)}</span>
                    <span className="block text-xs text-subtle-foreground">{t(p.descKey)}</span>
                  </span>
                </label>
              ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={savePermissions} disabled={submitting} className="btn-navy w-full">
          {submitting ? t('loading') : `${t('save')} ${t('permissions')}`}
        </button>
      </Modal>

      <Modal open={!!credentials} title="Employee Login Credentials" onClose={() => setCredentials(null)}>
        {credentials && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Share these with <strong>{credentials.name}</strong> if the email does not arrive.</p>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Email</span><span className="font-medium text-foreground">{credentials.email}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Temporary password</span><code className="font-mono font-semibold text-foreground">{credentials.tempPassword}</code></div>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(`Email: ${credentials.email}\nPassword: ${credentials.tempPassword}`)}
              className="btn-navy w-full"
            >
              Copy credentials
            </button>
            <button onClick={() => setCredentials(null)} className="btn-outline w-full">Done</button>
          </div>
        )}
      </Modal>

      <Modal open={!!activityTarget} title={`Activity — ${activityTarget?.user?.name ?? ''}`} onClose={() => setActivityTarget(null)} wide>
        {activityLoading ? (
          <SkeletonCard rows={4} />
        ) : activitySales.length === 0 ? (
          <EmptyState message="No sales recorded by this employee" />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr>
                <th className="px-4 py-2">Receipt</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activitySales.map((s) => (
                <tr key={s.id} className="hover:bg-muted transition-colors">
                  <td className="px-4 py-2 font-medium text-foreground">{s.receiptNumber ?? '-'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDateTime(s.saleDate)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.customer?.name ?? 'Walk-in'}</td>
                  <td className="px-4 py-2 text-right font-semibold text-secondary">{formatCurrency(s.grandTotal)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </PageWrapper>
  );
}
