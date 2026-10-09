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
// General Reports and Finance Overview are owner-only and intentionally absent.
const PERMISSION_GROUPS: Array<{ title: string; items: Array<{ id: string; label: string }> }> = [
  { title: 'Sales', items: [
    { id: 'sales:create', label: 'Record sale' },
    { id: 'sales:view', label: 'View sales' },
    { id: 'sales:refund', label: 'Process refund' },
    { id: 'sales:cancel', label: 'Void/cancel sale' },
  ] },
  { title: 'Products & Inventory', items: [
    { id: 'products:view', label: 'View products' },
    { id: 'products:create', label: 'Add product' },
    { id: 'products:update', label: 'Edit product' },
    { id: 'products:delete', label: 'Delete product' },
    { id: 'inventory:view', label: 'View stock' },
    { id: 'inventory:adjust', label: 'Adjust stock' },
  ] },
  { title: 'Customers & Credit', items: [
    { id: 'customers:view', label: 'View customers' },
    { id: 'customers:create', label: 'Add customer' },
    { id: 'customers:update', label: 'Edit customer' },
    { id: 'credit:create', label: 'Issue credit (deni)' },
    { id: 'credit:collect', label: 'Collect repayments' },
    { id: 'credit:read', label: 'View credit balances' },
    { id: 'credit:writeoff', label: 'Write off bad debt' },
  ] },
  { title: 'Expenses & Purchases', items: [
    { id: 'expenses:create', label: 'Record expenses' },
    { id: 'expenses:read', label: 'View expenses' },
    { id: 'expenses:approve', label: 'Approve expenses' },
    { id: 'purchases:view', label: 'View purchases' },
    { id: 'purchases:create', label: 'Create purchases' },
    { id: 'purchases:approve', label: 'Approve purchases' },
  ] },
  { title: 'Shifts', items: [
    { id: 'shift:open', label: 'Open shift' },
    { id: 'shift:close', label: 'Close shift' },
    { id: 'shift:view', label: 'View shifts' },
  ] },
  { title: 'Reports', items: [
    { id: 'reports:sales', label: 'Sales report' },
    { id: 'reports:inventory', label: 'Inventory report' },
    { id: 'reports:credit', label: 'Credit (deni) report' },
    { id: 'reports:activity_log', label: 'Staff activity log' },
    { id: 'reports:loans', label: 'Business loans report' },
    { id: 'reports:valuation', label: 'Stock value / valuation' },
    { id: 'reports:communications', label: 'Send SMS / WhatsApp (Premium)' },
  ] },
  { title: 'Financial Controls', items: [
    { id: 'loans:read', label: 'View loans' },
    { id: 'loans:write', label: 'Manage loans' },
    { id: 'cash:read', label: 'View cash' },
    { id: 'cash:write', label: 'Manage cash' },
    { id: 'finance:read', label: 'View payables / capital' },
  ] },
  { title: 'Staff', items: [
    { id: 'employees:view', label: 'View employees' },
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
  const { activeShopId, loading: shopLoading } = useShop();
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
  const [form, setForm] = useState({ name: '', phone: '', role: 'Cashier' });
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
    try {
      await apiClient.post(`/shops/${activeShopId}/employees`, {
        name: form.name,
        phone: form.phone,
        role: form.role,
        permissions: selectedPerms,
      });
      toast('Employee added. SMS sent with temp PIN.', 'success');
      setAddOpen(false);
      setForm({ name: '', phone: '', role: 'Cashier' });
      setSelectedPerms(DEFAULT_EMPLOYEE_PERMISSIONS);
      load();
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

  const resetPin = async (emp: EmployeeRow) => {
    setSubmitting(true);
    try {
      await apiClient.post(`/employees/${emp.id}/reset-pin`);
      toast('PIN reset. SMS sent.', 'success');
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
      breadcrumb={['Owner', t('people'), t('employees')]}
      actions={
        <button onClick={() => { setAddOpen(true); setSelectedPerms(DEFAULT_EMPLOYEE_PERMISSIONS); }} className="btn-navy inline-flex items-center gap-2">
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
                  <td className="px-4 py-3 text-muted-foreground">{e.user?.phone ?? '-'}</td>
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
                      <button onClick={() => resetPin(e)} className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline">
                        <KeyRound size={14} /> {t('resetPin')}
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
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="e.g. 0754111111" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
              <option value="Cashier">Cashier</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Permissions</label>
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{group.title}</p>
                  <div className="space-y-2">
                    {group.items.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded" />
                        {p.label}
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

      <Modal open={!!permTarget} title={`Permissions — ${permTarget?.user?.name ?? ''}`} onClose={() => setPermTarget(null)}>
        <div className="space-y-4 mb-4">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{group.title}</p>
              <div className="space-y-2">
              {group.items.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded" />
                  {p.label}
                </label>
              ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={savePermissions} disabled={submitting} className="btn-navy w-full">
          {submitting ? 'Saving...' : 'Save Permissions'}
        </button>
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
