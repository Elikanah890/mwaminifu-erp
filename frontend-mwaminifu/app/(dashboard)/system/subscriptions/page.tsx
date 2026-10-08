'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { SubscriptionPlan, ShopSubscription, PaginationMeta } from '@/lib/types';
import { formatDate, formatCurrency, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { Pill } from '@/components/StatusBadge';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import PageWrapper from '@/components/PageWrapper';
import { Stagger, StaggerItem, MotionCard, Reveal, motion } from '@/components/motion';

const EMPTY_PLAN: Omit<SubscriptionPlan, 'id' | 'createdAt'> = {
  name: '',
  description: '',
  price: 0,
  billingCycle: 'MONTHLY',
  features: [],
  limits: {},
  isActive: true,
};

type PlanForm = typeof EMPTY_PLAN;

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<ShopSubscription[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0 });
  const [tab, setTab] = useState<'plans' | 'subscriptions'>('plans');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SubscriptionPlan | 'new' | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_PLAN);
  const [featuresText, setFeaturesText] = useState('');
  const [limitsText, setLimitsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingSub, setEditingSub] = useState<ShopSubscription | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const res = await apiClient.get<SubscriptionPlan[]>('/admin/subscriptions/plans');
      if (res.data) setPlans(res.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  const loadSubs = useCallback(
    async (page: number) => {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (status) params.set('status', status);
      const res = await apiClient.get<ShopSubscription[]>(`/admin/subscriptions?${params.toString()}`);
      if (res.data) setSubscriptions(res.data);
      if (res.pagination) setMeta(res.pagination);
    },
    [status]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPlans(), loadSubs(1)])
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [loadPlans, loadSubs]);

  const switchTab = (next: typeof tab) => {
    setTab(next);
  };

  const openCreate = () => {
    setEditing('new');
    setForm(EMPTY_PLAN);
    setFeaturesText('');
    setLimitsText('');
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      price: plan.price,
      billingCycle: plan.billingCycle,
      features: plan.features,
      limits: plan.limits,
      isActive: plan.isActive,
    });
    setFeaturesText(plan.features.join('\n'));
    setLimitsText(JSON.stringify(plan.limits ?? {}, null, 2));
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        features: featuresText.split('\n').map((f) => f.trim()).filter(Boolean),
        limits: (() => {
          try {
            return limitsText.trim() ? JSON.parse(limitsText) : {};
          } catch {
            throw new Error('Limits must be valid JSON');
          }
        })(),
      };
      if (editing === 'new') {
        await apiClient.post('/admin/subscriptions/plans', body);
      } else {
        await apiClient.put(`/admin/subscriptions/plans/${editing.id}`, body);
      }
      setEditing(null);
      loadPlans();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (plan: SubscriptionPlan) => {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    setError('');
    try {
      await apiClient.del(`/admin/subscriptions/plans/${plan.id}`);
      loadPlans();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const updateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = {};
      const statusEl = (e.target as HTMLFormElement).elements.namedItem('subStatus') as HTMLSelectElement;
      const planEl = (e.target as HTMLFormElement).elements.namedItem('subPlan') as HTMLSelectElement;
      const endEl = (e.target as HTMLFormElement).elements.namedItem('subEnd') as HTMLInputElement;
      if (statusEl) body.status = statusEl.value;
      if (planEl?.value && planEl.value !== editingSub.plan) body.plan = planEl.value;
      if (endEl?.value) body.endDate = endEl.value;
      await apiClient.put(`/admin/subscriptions/${editingSub.id}`, body);
      setEditingSub(null);
      loadSubs(meta.page);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper title="Subscriptions" description="Plans and active shop subscriptions" breadcrumb={['System', 'Subscriptions']} actions={<motion.button onClick={openCreate} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-gold">+ New Plan</motion.button>}>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Reveal className="flex gap-2 mb-4">
        <motion.button
          onClick={() => switchTab('plans')}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === 'plans' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}
        >
          Plans ({plans.length})
        </motion.button>
        <motion.button
          onClick={() => switchTab('subscriptions')}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === 'subscriptions' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'}`}
        >
          Active Subscriptions ({meta.total})
        </motion.button>
      </Reveal>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : tab === 'plans' ? (
        plans.length === 0 ? (
          <EmptyState message="No plans yet. Create your first plan." />
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <StaggerItem key={plan.id}>
                <MotionCard className="surface-card p-5 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
                    <Pill tone={plan.isActive ? 'green' : 'gray'}>{plan.isActive ? 'Active' : 'Inactive'}</Pill>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{plan.description || 'No description'}</p>
                  <p className="text-2xl font-bold text-primary mb-1">
                    {formatCurrency(plan.price)} <span className="text-sm font-normal text-muted-foreground">/ {plan.billingCycle}</span>
                  </p>
                  <ul className="text-sm text-foreground space-y-1 mb-4 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-secondary mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.features.length === 0 && <li className="text-subtle-foreground text-xs">No features listed</li>}
                  </ul>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(plan)} className="flex-1 btn-outline">Edit</button>
                    <button onClick={() => deletePlan(plan)} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-danger border border-danger/25 hover:bg-danger/10">
                      Delete
                    </button>
                  </div>
                </MotionCard>
              </StaggerItem>
            ))}
          </Stagger>
        )
      ) : (
        <div>
          <Reveal className="flex items-center gap-3 mb-4">
            <label className="text-sm text-muted-foreground">Filter status</label>
            <select className="input-field max-w-[160px]" value={status} onChange={(e) => { setStatus(e.target.value); loadSubs(1); }}>
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PENDING">Pending</option>
            </select>
          </Reveal>
          <Reveal className="surface-card overflow-hidden">
            {subscriptions.length === 0 ? (
              <EmptyState message="No subscriptions" />
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                  <tr className="border-b border-border">
                    <th className="py-3 px-6 font-semibold">Shop</th>
                    <th className="py-3 px-6 font-semibold">Owner</th>
                    <th className="py-3 px-6 font-semibold">Plan</th>
                    <th className="py-3 px-6 font-semibold">Status</th>
                    <th className="py-3 px-6 font-semibold">Start</th>
                    <th className="py-3 px-6 font-semibold">End</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-muted">
                      <td className="py-3 px-6 font-medium text-foreground">{s.shop?.name || '-'}</td>
                      <td className="py-3 px-6 text-muted-foreground">{s.shop?.owner?.name || '-'}</td>
                      <td className="py-3 px-6"><Pill tone="navy">{s.plan}</Pill></td>
                      <td className="py-3 px-6">
                        <Pill tone={s.status === 'ACTIVE' ? 'green' : s.status === 'EXPIRED' ? 'red' : 'amber'}>{s.status}</Pill>
                      </td>
                      <td className="py-3 px-6 text-xs text-muted-foreground">{formatDate(s.startDate)}</td>
                      <td className="py-3 px-6 text-xs text-muted-foreground">{s.endDate ? formatDate(s.endDate) : '-'}</td>
                      <td className="py-3 px-6">
                        <button onClick={() => setEditingSub(s)} className="text-secondary hover:underline text-xs font-medium">Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            <div className="px-6 py-3 border-t border-border">
              <Pagination page={meta.page} total={meta.total} limit={10} onPageChange={loadSubs} />
            </div>
          </Reveal>
        </div>
      )}

      <Modal open={!!editing} title={editing === 'new' ? 'Create Plan' : editing ? `Edit Plan: ${editing.name}` : ''} onClose={() => setEditing(null)} wide>
        <form onSubmit={savePlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input className="input-field" placeholder="Plan name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <input className="input-field" type="number" min="0" step="0.01" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} required />
              <select className="input-field" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="ONE_TIME">One-time</option>
              </select>
            </div>
          </div>
          <input className="input-field" placeholder="Description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <textarea className="input-field min-h-[80px]" placeholder="Features (one per line)" value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
          <textarea className="input-field min-h-[80px] font-mono text-xs" placeholder='Limits as JSON, e.g. {"products": 500, "employees": 10}' value={limitsText} onChange={(e) => setLimitsText(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="flex-1 btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-navy">{saving ? 'Saving...' : 'Save Plan'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingSub} title="Manage Subscription" onClose={() => setEditingSub(null)}>
        {editingSub && (
          <form onSubmit={updateSubscription} className="space-y-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-semibold text-foreground">{editingSub.shop?.name}</p>
              <p className="text-xs text-muted-foreground">{editingSub.shop?.owner?.name}</p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Plan</label>
              <select name="subPlan" className="input-field" defaultValue={editingSub.plan}>
                {plans.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Status</label>
              <select name="subStatus" className="input-field" defaultValue={editingSub.status}>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">End date</label>
              <input name="subEnd" type="date" className="input-field" defaultValue={editingSub.endDate ? editingSub.endDate.slice(0, 10) : ''} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditingSub(null)} className="flex-1 btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 btn-navy">{saving ? 'Saving...' : 'Update'}</button>
            </div>
          </form>
        )}
      </Modal>
    </PageWrapper>
  );
}