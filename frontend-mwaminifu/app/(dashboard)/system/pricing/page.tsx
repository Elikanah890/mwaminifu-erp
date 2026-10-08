'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { SubscriptionPlan } from '@/lib/types';
import { formatCurrency, errorMessage } from '@/lib/format';
import Modal from '@/components/Modal';
import { Pill } from '@/components/StatusBadge';
import { Skeleton } from '@/components/Spinner';
import PageWrapper from '@/components/PageWrapper';
import { useToast } from '@/components/Toast';
import { Stagger, StaggerItem, MotionCard, Reveal, motion } from '@/components/motion';
import { DollarSign, Pencil, Plus, Sparkles, Star, Trash2 } from 'lucide-react';

type PlanForm = {
  name: string;
  description: string;
  price: number;
  billingCycle: string;
  features: string;
  limits: string;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
};

const EMPTY_FORM: PlanForm = {
  name: '',
  description: '',
  price: 0,
  billingCycle: 'MONTHLY',
  features: '',
  limits: '{}',
  isActive: true,
  isDefault: false,
  displayOrder: 0,
};

export default function PricingPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SubscriptionPlan | 'new' | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<SubscriptionPlan[]>('/admin/subscriptions/plans');
      setPlans(res.data ?? []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing('new');
    setForm(EMPTY_FORM);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      price: plan.price,
      billingCycle: plan.billingCycle,
      features: (plan.features ?? []).join('\n'),
      limits: JSON.stringify(plan.limits ?? {}, null, 2),
      isActive: plan.isActive,
      isDefault: plan.isDefault ?? false,
      displayOrder: plan.displayOrder ?? 0,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      let limits: Record<string, unknown> = {};
      try {
        limits = form.limits.trim() ? JSON.parse(form.limits) : {};
      } catch {
        throw new Error('Limits must be valid JSON');
      }
      const body = {
        name: form.name,
        description: form.description,
        price: form.price,
        billingCycle: form.billingCycle,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
        limits,
        isActive: form.isActive,
        isDefault: form.isDefault,
        displayOrder: form.displayOrder,
      };
      if (editing === 'new') {
        await apiClient.post('/admin/subscriptions/plans', body);
        toast('Plan created', 'success');
      } else {
        await apiClient.put(`/admin/subscriptions/plans/${editing.id}`, body);
        toast('Plan updated', 'success');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (plan: SubscriptionPlan) => {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    try {
      await apiClient.del(`/admin/subscriptions/plans/${plan.id}`);
      toast('Plan deleted', 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const toggleActive = async (plan: SubscriptionPlan) => {
    try {
      await apiClient.put(`/admin/subscriptions/plans/${plan.id}`, { isActive: !plan.isActive });
      toast(plan.isActive ? 'Plan deactivated' : 'Plan activated', 'success');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const cycleLabel: Record<string, string> = { MONTHLY: 'month', YEARLY: 'year', WEEKLY: 'week', ONE_TIME: 'once' };

  return (
    <PageWrapper
      title="Pricing"
      description="Create and manage the subscription plans customers see on the public site."
      breadcrumb={['System', 'Pricing']}
      actions={
        <motion.button onClick={openCreate} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="btn-gold">
          <Plus size={16} /> New Plan
        </motion.button>
      }
    >
      {error && <div className="mb-4 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface-card space-y-4 p-6">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Reveal>
          <div className="surface-card p-12 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-[#9a7b1f] dark:text-[#E3C25A]">
              <Sparkles size={26} />
            </div>
            <h2 className="text-xl font-semibold text-foreground">No plans yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              The public pricing page is empty until you add your first plan. Create one to publish it to customers.
            </p>
            <button onClick={openCreate} className="btn-gold mt-8 inline-flex">
              <Plus size={16} /> Create your first plan
            </button>
          </div>
        </Reveal>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <StaggerItem key={plan.id}>
              <MotionCard className="surface-card flex h-full flex-col p-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    {plan.isDefault && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#9a7b1f] dark:text-[#E3C25A]">
                        <Star size={11} /> Default
                      </span>
                    )}
                  </div>
                  <Pill tone={plan.isActive ? 'green' : 'gray'}>{plan.isActive ? 'Active' : 'Inactive'}</Pill>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{plan.description || 'No description'}</p>
                <p className="mb-4 text-3xl font-semibold text-primary tabular-nums">
                  {formatCurrency(plan.price)}
                  <span className="text-sm font-normal text-muted-foreground">/{cycleLabel[plan.billingCycle] ?? 'month'}</span>
                </p>
                <ul className="mb-5 flex-1 space-y-1.5 text-sm text-foreground">
                  {(plan.features ?? []).slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-secondary">✓</span>
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                  {(plan.features ?? []).length === 0 && <li className="text-xs text-subtle-foreground">No features listed</li>}
                </ul>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(plan)} className="flex-1 btn-outline">
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => toggleActive(plan)}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-brand hover:bg-muted"
                  >
                    {plan.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => remove(plan)}
                    className="rounded-lg border border-danger/25 p-2 text-danger transition-brand hover:bg-danger/10"
                    aria-label="Delete plan"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </MotionCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Modal open={!!editing} title={editing === 'new' ? 'Create Plan' : editing ? `Edit Plan: ${editing.name}` : ''} onClose={() => setEditing(null)} wide>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Plan name</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Price (TZS)</label>
                <div className="relative">
                  <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
                  <input
                    className="input-field pl-8"
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Billing</label>
                <select className="input-field" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="ONE_TIME">One-time</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
            <input className="input-field" placeholder="Short summary shown under the plan name" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Features (one per line)</label>
            <textarea
              className="input-field min-h-[110px]"
              placeholder={'POS & sales\nInventory & stock alerts\nReports & valuation'}
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Limits (JSON, optional)</label>
            <textarea
              className="input-field min-h-[70px] font-mono text-xs"
              placeholder='{"products": 500, "employees": 10, "shops": 1}'
              value={form.limits}
              onChange={(e) => setForm({ ...form, limits: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Display order</label>
              <input
                className="input-field"
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-end gap-5 pb-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Default
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="flex-1 btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-navy">
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
