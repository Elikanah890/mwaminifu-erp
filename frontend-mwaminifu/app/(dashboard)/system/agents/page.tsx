'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiErrorException } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';
import { statusLabel } from '@/lib/i18n/labels';
import { Agent, AgentDetail, PaginationMeta } from '@/lib/types';
import { formatDate, formatNumber, formatCurrency, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import StatusBadge, { Pill } from '@/components/StatusBadge';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import PageWrapper from '@/components/PageWrapper';
import SearchBar from '@/components/SearchBar';
import { Reveal, motion } from '@/components/motion';
import { useToast } from '@/components/Toast';

const PER_PAGE = 10;

function generateUsername(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'agent';
  return `${base}${Math.floor(100 + Math.random() * 900)}`;
}

export default function AgentsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: PER_PAGE, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState({ username: '', name: '', phone: '', email: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  // Credentials to show the System Owner so they can hand them to the agent.
  const [createdCreds, setCreatedCreds] = useState<{ username: string; email: string; tempPassword: string; phone?: string } | null>(null);
  const [resetCreds, setResetCreds] = useState<{ username: string; email?: string; tempPassword: string } | null>(null);

  const load = useCallback(
    async (page: number) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
        if (search.trim()) params.set('search', search.trim());
        if (status) params.set('status', status);
        const res = await apiClient.get<Agent[]>(`/admin/agents?${params.toString()}`);
        if (res.data) setAgents(res.data);
        if (res.pagination) setMeta(res.pagination);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [search, status]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const openCreate = () => {
    setForm({ username: generateUsername('agent'), name: '', phone: '', email: '' });
    setFormError('');
    setShowCreate(true);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('create') === '1') {
      openCreate();
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await apiClient.post<{ username: string; email: string; tempPassword: string }>('/admin/agents', {
        username: form.username.trim(),
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim().toLowerCase(),
      });
      setShowCreate(false);
      setCreatedCreds({
        username: res.data?.username ?? form.username.trim(),
        email: res.data?.email ?? form.email.trim().toLowerCase(),
        tempPassword: res.data?.tempPassword ?? '',
        phone: form.phone.trim() || undefined,
      });
      toast(t('agentRegistered'));
      load(1);
    } catch (err) {
      const msg = errorMessage(err);
      setFormError(msg);
      if (err instanceof ApiErrorException && err.status === 409) toast(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError('');
    setSaving(true);
    try {
      await apiClient.put(`/admin/agents/${editing.id}`, {
        name: editing.name,
        phone: editing.phone || '',
        email: editing.email || '',
        isActive: editing.isActive,
      });
      setEditing(null);
      toast(t('agentUpdated'));
      load(meta.page);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (agent: Agent) => {
    try {
      await apiClient.put(`/admin/agents/${agent.id}/toggle`, {});
      toast(agent.isActive ? t('agentSuspended') : t('agentActivated'));
      load(meta.page);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleResetPassword = async (agent: Agent) => {
    if (!window.confirm(`${t('confirmResetPassword')} ${agent.name} (AGAC-${agent.username})? ${t('resetPasswordSent')}`)) return;
    try {
      const res = await apiClient.post<{ username: string; tempPassword: string }>(`/admin/agents/${agent.id}/reset-password`, {});
      if (res.data) setResetCreds({ username: res.data.username, email: (res.data as { email?: string }).email, tempPassword: res.data.tempPassword });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handlePayout = async (agent: Agent) => {
    if (!window.confirm(`${t('confirmPayout')} ${formatCurrency(agent.commissionPending ?? 0)} ${t('pendingCommissionTo')} ${agent.name}?`)) return;
    try {
      const res = await apiClient.post<{ amount: number; reference: string }>(`/admin/agents/${agent.id}/payout`, {});
      toast(`${t('payoutSent')} ${res.data?.reference ?? ''} (${formatCurrency(res.data?.amount ?? 0)})`);
      load(meta.page);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const copy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast(t('copied')), () => {});
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await apiClient.del(`/admin/agents/${deleting.id}`);
      setDeleting(null);
      toast(t('agentDeleted'));
      load(1);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await apiClient.get<AgentDetail>(`/admin/agents/${id}`);
      if (res.data) setDetail(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <PageWrapper title={t('agents')} description={t('agentsDesc')} breadcrumb={[t('systemOwner'), t('agents')]}>
      <Reveal className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
        <SearchBar value={search} onChange={(v) => setSearch(v)} placeholder={t('searchAgents')} />
        <div className="flex flex-wrap items-center gap-3">
          <select className="input-field max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('allStatus')}</option>
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
          </select>
          <motion.button
            onClick={openCreate}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="btn-gold"
          >
            {t('registerAgent')}
          </motion.button>
        </div>
      </Reveal>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <SkeletonTable rows={PER_PAGE} />
      ) : (
        <Reveal className="surface-card overflow-hidden">
          {agents.length === 0 ? (
            <EmptyState message={t('noAgents')} />
          ) : (
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 px-6 font-semibold">{t('agentCode')}</th>
                  <th className="py-3 px-6 font-semibold">{t('name')}</th>
                  <th className="hidden py-3 px-6 font-semibold sm:table-cell">{t('phone')}</th>
                  <th className="hidden py-3 px-6 font-semibold md:table-cell">{t('customersRegistered')}</th>
                  <th className="hidden py-3 px-6 font-semibold text-right md:table-cell">{t('commissionPending')}</th>
                  <th className="hidden py-3 px-6 font-semibold text-right md:table-cell">{t('commissionEarned')}</th>
                  <th className="hidden py-3 px-6 font-semibold text-right lg:table-cell">{t('commissionPaid')}</th>
                  <th className="py-3 px-6 font-semibold">{t('status')}</th>
                  <th className="hidden py-3 px-6 font-semibold lg:table-cell">{t('createdLabel')}</th>
                  <th className="py-3 px-6 text-right font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agents.map((agent) => (
                  <tr key={agent.id} className="transition-colors hover:bg-muted">
                    <td className="py-3 px-6 font-mono text-primary">AGAC-{agent.username}</td>
                    <td className="py-3 px-6 font-medium text-foreground">{agent.name}</td>
                    <td className="hidden py-3 px-6 text-muted-foreground sm:table-cell">{agent.phone || '-'}</td>
                    <td className="hidden py-3 px-6 md:table-cell">{formatNumber(agent._count?.onboardedUsers ?? 0)}</td>
                    <td className="hidden py-3 px-6 text-right font-semibold text-warning md:table-cell">{formatCurrency(agent.commissionPending ?? 0)}</td>
                    <td className="hidden py-3 px-6 text-right font-semibold text-secondary md:table-cell">{formatCurrency(agent.commissionEarned ?? 0)}</td>
                    <td className="hidden py-3 px-6 text-right text-muted-foreground lg:table-cell">{formatCurrency(agent.commissionPaid ?? 0)}</td>
                    <td className="py-3 px-6">
                      <StatusBadge active={agent.isActive} activeLabel={t('active')} inactiveLabel={t('inactive')} />
                    </td>
                    <td className="hidden py-3 px-6 text-muted-foreground text-xs lg:table-cell">{formatDate(agent.createdAt)}</td>
                    <td className="py-3 px-6 text-right"><div className="flex flex-wrap items-center justify-end gap-2">
                      <button onClick={() => openDetail(agent.id)} className="text-xs text-secondary font-medium hover:underline">
                        {t('view')}
                      </button>
                      <button onClick={() => setEditing(agent)} className="text-xs text-secondary font-medium hover:underline">
                        {t('edit')}
                      </button>
                      <button onClick={() => handleResetPassword(agent)} className="text-xs text-primary font-medium hover:underline">
                        {t('resetPassword')}
                      </button>
                      {(agent.commissionPending ?? 0) > 0 && (
                        <button onClick={() => handlePayout(agent)} className="text-xs text-success font-medium hover:underline">
                          {t('payouts')}
                        </button>
                      )}
                      <button onClick={() => handleToggle(agent)} className="text-xs text-warning font-medium hover:underline">
                        {agent.isActive ? t('suspend') : t('activate')}
                      </button>
                      <button onClick={() => setDeleting(agent)} className="text-xs text-danger font-medium hover:underline">
                        {t('delete')}
                      </button>
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {agents.length > 0 && (
            <div className="divide-y divide-border md:hidden">
              {agents.map((agent) => (
                <div key={`mobile-${agent.id}`} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-primary">AGAC-{agent.username}</p>
                      <p className="mt-0.5 font-semibold text-foreground">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.email || agent.phone || '-'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatNumber(agent._count?.onboardedUsers ?? 0)} {t('customers').toLowerCase()} · {formatCurrency(agent.commissionPending ?? 0)} {t('pending').toLowerCase()} · {formatCurrency(agent.commissionPaid ?? 0)} {t('paid').toLowerCase()}</p>
                    </div>
                    <StatusBadge active={agent.isActive} activeLabel={t('active')} inactiveLabel={t('inactive')} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs font-medium">
                    <button onClick={() => openDetail(agent.id)} className="text-secondary hover:underline">{t('view')}</button>
                    <button onClick={() => setEditing(agent)} className="text-secondary hover:underline">{t('edit')}</button>
                    <button onClick={() => handleResetPassword(agent)} className="text-primary hover:underline">{t('resetPassword')}</button>
                    {(agent.commissionPending ?? 0) > 0 && (
                      <button onClick={() => handlePayout(agent)} className="text-success hover:underline">{t('payouts')}</button>
                    )}
                    <button onClick={() => handleToggle(agent)} className="text-warning hover:underline">{agent.isActive ? t('suspend') : t('activate')}</button>
                    <button onClick={() => setDeleting(agent)} className="text-danger hover:underline">{t('delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-6 py-3 border-t border-border">
            <Pagination page={meta.page} total={meta.total} limit={PER_PAGE} onPageChange={load} />
          </div>
        </Reveal>
      )}

      {/* Create modal */}
      <Modal open={showCreate} title={t('registerNewAgent')} onClose={() => setShowCreate(false)}>
        {formError && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
        <form onSubmit={handleCreate} className="space-y-4">
          <input className="input-field" placeholder={t('fullName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input-field" type="email" placeholder={t('emailRequired')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input-field" placeholder={t('phoneOptional')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('usernameAuto')}</label>
            <div className="flex gap-2">
              <input className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <button type="button" className="btn-outline shrink-0" onClick={() => setForm({ ...form, username: generateUsername(form.name) })}>
                {t('regenerate')}
              </button>
            </div>
          </div>
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            {t('agentSignsInWith')} <strong>{t('email').toLowerCase()}</strong> {t('welcomeCredentialsEmailed')}
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 btn-outline">
              {t('cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-navy">
              {saving ? t('creating') : t('registerAgent')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail || detailLoading} title={t('agentDetails')} onClose={() => setDetail(null)} wide>
        {detailLoading ? (
          <SkeletonCard rows={4} />
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary">{detail.name}</h3>
                <p className="text-sm text-muted-foreground">AGAC-{detail.username} {detail.email ? `· ${detail.email}` : ''}</p>
              </div>
              <StatusBadge active={detail.isActive} activeLabel={t('active')} inactiveLabel={t('inactive')} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="stat-card"><p className="text-xs text-muted-foreground">{t('customers')}</p><p className="text-lg font-bold text-primary">{formatNumber(detail.stats?.onboardedUsers ?? 0)}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">{t('activeCustomers')}</p><p className="text-lg font-bold text-secondary">{formatNumber(detail.stats?.activeUsers ?? 0)}</p></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="stat-card"><p className="text-xs text-muted-foreground">{t('commissionEarned')}</p><p className="text-lg font-bold text-primary">{formatCurrency(detail.stats?.commissionEarned ?? 0)}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">{t('commissionPending')}</p><p className="text-lg font-bold text-warning">{formatCurrency(detail.stats?.commissionPending ?? 0)}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">{t('commissionPaid')}</p><p className="text-lg font-bold text-secondary">{formatCurrency(detail.stats?.commissionPaid ?? 0)}</p></div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">{t('registrationLog')} ({detail.onboardedUsers?.length ?? 0})</h4>
              {detail.onboardedUsers?.length === 0 ? (
                <EmptyState message={t('noBusinessesRegistered')} />
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 font-semibold">{t('business')}</th>
                        <th className="py-2 px-3 font-semibold">{t('phone')}</th>
                        <th className="py-2 px-3 font-semibold">{t('status')}</th>
                        <th className="py-2 px-3 font-semibold">{t('registered')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.onboardedUsers.map((u) => (
                        <tr key={u.id} className="transition-colors hover:bg-muted">
                          <td className="py-2 px-3 font-medium">{u.name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{u.phone ?? '-'}</td>
                          <td className="py-2 px-3"><Pill tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? t('active') : t('inactive')}</Pill></td>
                          <td className="py-2 px-3 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4 grid gap-4">
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2">{t('commissions')} ({detail.commissions?.length ?? 0})</h4>
                {(detail.commissions?.length ?? 0) === 0 ? (
                  <p className="text-xs text-subtle-foreground">{t('noCommissions')}.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wider text-subtle-foreground">
                        <tr className="border-b border-border">
                          <th className="py-2 px-3 font-semibold">{t('date')}</th>
                          <th className="py-2 px-3 font-semibold">{t('owner')}</th>
                          <th className="py-2 px-3 font-semibold">{t('plan')}</th>
                          <th className="py-2 px-3 font-semibold text-right">{t('amount')}</th>
                          <th className="py-2 px-3 font-semibold">{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detail.commissions!.map((c) => (
                          <tr key={c.id}>
                            <td className="py-2 px-3 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                            <td className="py-2 px-3 font-medium">{c.owner?.name ?? '—'}</td>
                            <td className="py-2 px-3 text-muted-foreground">{c.payment?.subscription?.plan ?? '—'}</td>
                            <td className="py-2 px-3 text-right font-semibold text-secondary">{formatCurrency(c.amount)}</td>
                            <td className="py-2 px-3"><Pill tone={c.status === 'PAID' ? 'green' : c.status === 'PENDING' ? 'amber' : 'gray'}>{statusLabel(t, c.status)}</Pill></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2">{t('payouts')} ({detail.payouts?.length ?? 0})</h4>
                {(detail.payouts?.length ?? 0) === 0 ? (
                  <p className="text-xs text-subtle-foreground">{t('noPayouts')}.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wider text-subtle-foreground">
                        <tr className="border-b border-border">
                          <th className="py-2 px-3 font-semibold">{t('date')}</th>
                          <th className="py-2 px-3 font-semibold">{t('reference')}</th>
                          <th className="py-2 px-3 font-semibold text-right">{t('amount')}</th>
                          <th className="py-2 px-3 font-semibold">{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detail.payouts!.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 text-muted-foreground text-xs">{formatDate(p.createdAt)}</td>
                            <td className="py-2 px-3 font-mono text-xs">{p.reference ?? '—'}</td>
                            <td className="py-2 px-3 text-right font-semibold text-secondary">{formatCurrency(p.amount)}</td>
                            <td className="py-2 px-3"><Pill tone={p.status === 'COMPLETED' ? 'green' : 'amber'}>{statusLabel(t, p.status)}</Pill></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} title={t('editAgent')} onClose={() => setEditing(null)}>
        {formError && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
        {editing && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <input className="input-field" placeholder={t('fullName')} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            <input className="input-field" placeholder={t('phone')} value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <input className="input-field" type="email" placeholder={t('email')} value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
              {t('accountActive')}
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 btn-outline">
                {t('cancel')}
              </button>
              <button type="submit" disabled={saving} className="flex-1 btn-navy">
                {saving ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleting} title={t('deleteAgent')} onClose={() => setDeleting(null)}>
        <p className="text-sm text-muted-foreground mb-4">
          {t('deleteAgentDesc')} <strong>{deleting?.name}</strong> (AGAC-{deleting?.username}) {t('andDisableLogin')}
          {t('noEffectOnBusinesses')}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setDeleting(null)} className="flex-1 btn-outline">
            {t('cancel')}
          </button>
          <button type="button" onClick={handleDelete} className="flex-1 btn-navy bg-danger">
            {t('deleteAgent')}
          </button>
        </div>
      </Modal>

      {/* New agent credentials */}
      <Modal open={!!createdCreds} title={t('agentLoginCredentials')} onClose={() => setCreatedCreds(null)}>
        {createdCreds && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              {t('welcomeEmailSentTo')} <strong>{createdCreds.email}</strong>{t('shareIfNotArrive')}
            </p>
            <CredRow label={t('loginEmail')} value={createdCreds.email} onCopy={() => copy(createdCreds.email)} />
            <CredRow label={t('tempPassword')} value={createdCreds.tempPassword} mono onCopy={() => copy(createdCreds.tempPassword)} />
            <CredRow label={t('agentCode')} value={`AGAC-${createdCreds.username}`} onCopy={() => copy(`AGAC-${createdCreds.username}`)} />
            <button
              onClick={() => copy(`Mwaminifu agent login\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.tempPassword}`)}
              className="btn-navy w-full"
            >
              {t('copyCredentials')}
            </button>
            <button onClick={() => setCreatedCreds(null)} className="btn-outline w-full">{t('done')}</button>
          </div>
        )}
      </Modal>

      {/* Reset password result */}
      <Modal open={!!resetCreds} title={t('newAgentPassword')} onClose={() => setResetCreds(null)}>
        {resetCreds && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">{t('passwordResetEmailed')}{resetCreds.email ? ` ${resetCreds.email}` : ''}.</p>
            <CredRow label={t('loginEmail')} value={resetCreds.email ?? resetCreds.username} onCopy={() => copy(resetCreds.email ?? resetCreds.username)} />
            <CredRow label={t('newPassword')} value={resetCreds.tempPassword} mono onCopy={() => copy(resetCreds.tempPassword)} />
            <button
              onClick={() => copy(`Mwaminifu agent login\nEmail: ${resetCreds.email ?? resetCreds.username}\nPassword: ${resetCreds.tempPassword}`)}
              className="btn-navy w-full"
            >
              {t('copyCredentials')}
            </button>
            <button onClick={() => setResetCreds(null)} className="btn-outline w-full">{t('done')}</button>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}

function CredRow({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">{label}</p>
        <p className={`truncate ${mono ? 'font-mono' : 'font-semibold'} text-foreground`}>{value}</p>
      </div>
      {onCopy && (
        <button type="button" onClick={onCopy} className="shrink-0 text-xs font-medium text-secondary hover:underline">
          {t('copy')}
        </button>
      )}
    </div>
  );
}
