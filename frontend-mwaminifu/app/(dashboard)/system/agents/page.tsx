'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
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

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  const rand = new Uint32Array(12);
  crypto.getRandomValues(rand);
  for (let i = 0; i < 12; i++) out += chars[rand[i] % chars.length];
  return out;
}

export default function AgentsPage() {
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

  const [form, setForm] = useState({ username: '', password: '', name: '', phone: '', email: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  // Credentials to show the System Owner so they can hand them to the agent.
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string; phone?: string } | null>(null);
  const [resetCreds, setResetCreds] = useState<{ username: string; password: string } | null>(null);

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
    setForm({ username: generateUsername('agent'), password: generatePassword(), name: '', phone: '', email: '' });
    setFormError('');
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await apiClient.post('/admin/agents', {
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      setShowCreate(false);
      setCreatedCreds({ username: form.username.trim(), password: form.password, phone: form.phone.trim() || undefined });
      toast('Agent registered successfully');
      load(1);
    } catch (err) {
      setFormError(errorMessage(err));
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
      toast('Agent updated');
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
      toast(agent.isActive ? 'Agent suspended' : 'Agent activated');
      load(meta.page);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleResetPassword = async (agent: Agent) => {
    if (!window.confirm(`Reset the password for ${agent.name} (AGAC-${agent.username})? A new password will be sent to their phone.`)) return;
    try {
      const res = await apiClient.post<{ username: string; tempPassword: string }>(`/admin/agents/${agent.id}/reset-password`, {});
      if (res.data) setResetCreds({ username: res.data.username, password: res.data.tempPassword });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handlePayout = async (agent: Agent) => {
    if (!window.confirm(`Pay out ${formatCurrency(agent.commissionEarned ?? 0)} pending commission to ${agent.name}?`)) return;
    try {
      const res = await apiClient.post<{ amount: number; reference: string }>(`/admin/agents/${agent.id}/payout`, {});
      toast(`Payout ${res.data?.reference ?? ''} sent (${formatCurrency(res.data?.amount ?? 0)})`);
      load(meta.page);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const copy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast('Copied'), () => {});
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await apiClient.del(`/admin/agents/${deleting.id}`);
      setDeleting(null);
      toast('Agent deleted');
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
    <PageWrapper title="Agents" description="Oversight of all AGAC agents" breadcrumb={['System', 'Agents']}>
      <Reveal className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
        <SearchBar value={search} onChange={(v) => setSearch(v)} placeholder="Search name, username, phone..." />
        <div className="flex flex-wrap items-center gap-3">
          <select className="input-field max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <motion.button
            onClick={openCreate}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="btn-gold"
          >
            + Register Agent
          </motion.button>
        </div>
      </Reveal>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <SkeletonTable rows={PER_PAGE} />
      ) : (
        <Reveal className="surface-card overflow-hidden">
          {agents.length === 0 ? (
            <EmptyState message="No agents found" />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 px-6 font-semibold">Agent Code</th>
                  <th className="py-3 px-6 font-semibold">Name</th>
                  <th className="py-3 px-6 font-semibold">Phone</th>
                  <th className="py-3 px-6 font-semibold">Customers Registered</th>
                  <th className="py-3 px-6 font-semibold text-right">Commission Earned</th>
                  <th className="py-3 px-6 font-semibold text-right">Commission Paid</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold">Created</th>
                  <th className="py-3 px-6 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agents.map((agent) => (
                  <tr key={agent.id} className="transition-colors hover:bg-muted">
                    <td className="py-3 px-6 font-mono text-primary">AGAC-{agent.username}</td>
                    <td className="py-3 px-6 font-medium text-foreground">{agent.name}</td>
                    <td className="py-3 px-6 text-muted-foreground">{agent.phone || '-'}</td>
                    <td className="py-3 px-6">{formatNumber(agent._count?.onboardedUsers ?? 0)}</td>
                    <td className="py-3 px-6 text-right font-semibold text-secondary">{formatCurrency(agent.commissionEarned ?? 0)}</td>
                    <td className="py-3 px-6 text-right text-muted-foreground">{formatCurrency(agent.commissionPaid ?? 0)}</td>
                    <td className="py-3 px-6">
                      <StatusBadge active={agent.isActive} />
                    </td>
                    <td className="py-3 px-6 text-muted-foreground text-xs">{formatDate(agent.createdAt)}</td>
                    <td className="py-3 px-6 text-right space-x-2">
                      <button onClick={() => openDetail(agent.id)} className="text-xs text-secondary font-medium hover:underline">
                        View
                      </button>
                      <button onClick={() => setEditing(agent)} className="text-xs text-secondary font-medium hover:underline">
                        Edit
                      </button>
                      <button onClick={() => handleResetPassword(agent)} className="text-xs text-primary font-medium hover:underline">
                        Reset password
                      </button>
                      {(agent.commissionEarned ?? 0) - (agent.commissionPaid ?? 0) > 0 && (
                        <button onClick={() => handlePayout(agent)} className="text-xs text-success font-medium hover:underline">
                          Payout
                        </button>
                      )}
                      <button onClick={() => handleToggle(agent)} className="text-xs text-warning font-medium hover:underline">
                        {agent.isActive ? 'Suspend' : 'Activate'}
                      </button>
                      <button onClick={() => setDeleting(agent)} className="text-xs text-danger font-medium hover:underline">
                        Delete
                      </button>
                    </td>
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

      {/* Create modal */}
      <Modal open={showCreate} title="Register New Agent" onClose={() => setShowCreate(false)}>
        {formError && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
        <form onSubmit={handleCreate} className="space-y-4">
          <input className="input-field" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input-field" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input className="input-field" type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Username (auto-generated)</label>
            <div className="flex gap-2">
              <input className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <button type="button" className="btn-outline shrink-0" onClick={() => setForm({ ...form, username: generateUsername(form.name) })}>
                Regenerate
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Temporary Password (share with the agent)</label>
            <div className="flex gap-2">
              <input className="input-field font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="btn-outline shrink-0" onClick={() => setForm({ ...form, password: generatePassword() })}>
                Regenerate
              </button>
            </div>
          </div>
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            The agent signs in through the app under <strong>Agent</strong> using this <strong>username</strong> and
            <strong> password</strong>. These are also sent to their phone by SMS automatically.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-navy">
              {saving ? 'Creating...' : 'Register Agent'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail || detailLoading} title="Agent Details" onClose={() => setDetail(null)} wide>
        {detailLoading ? (
          <SkeletonCard rows={4} />
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary">{detail.name}</h3>
                <p className="text-sm text-muted-foreground">AGAC-{detail.username} {detail.email ? `· ${detail.email}` : ''}</p>
              </div>
              <StatusBadge active={detail.isActive} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="stat-card"><p className="text-xs text-muted-foreground">Customers</p><p className="text-lg font-bold text-primary">{formatNumber(detail.stats?.onboardedUsers ?? 0)}</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Active Customers</p><p className="text-lg font-bold text-secondary">{formatNumber(detail.stats?.activeUsers ?? 0)}</p></div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Registration Log ({detail.onboardedUsers?.length ?? 0})</h4>
              {detail.onboardedUsers?.length === 0 ? (
                <EmptyState message="No businesses registered yet" />
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 font-semibold">Business</th>
                        <th className="py-2 px-3 font-semibold">Phone</th>
                        <th className="py-2 px-3 font-semibold">Status</th>
                        <th className="py-2 px-3 font-semibold">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.onboardedUsers.map((u) => (
                        <tr key={u.id} className="transition-colors hover:bg-muted">
                          <td className="py-2 px-3 font-medium">{u.name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{u.phone ?? '-'}</td>
                          <td className="py-2 px-3"><Pill tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Active' : 'Inactive'}</Pill></td>
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
                <h4 className="text-sm font-semibold text-primary mb-2">Commissions ({detail.commissions?.length ?? 0})</h4>
                {(detail.commissions?.length ?? 0) === 0 ? (
                  <p className="text-xs text-subtle-foreground">No commissions yet.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wider text-subtle-foreground">
                        <tr className="border-b border-border">
                          <th className="py-2 px-3 font-semibold">Date</th>
                          <th className="py-2 px-3 font-semibold">Owner</th>
                          <th className="py-2 px-3 font-semibold text-right">Amount</th>
                          <th className="py-2 px-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detail.commissions!.map((c) => (
                          <tr key={c.id}>
                            <td className="py-2 px-3 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                            <td className="py-2 px-3 font-medium">{c.owner?.name ?? '—'}</td>
                            <td className="py-2 px-3 text-right font-semibold text-secondary">{formatCurrency(c.amount)}</td>
                            <td className="py-2 px-3"><Pill tone={c.status === 'PAID' ? 'green' : c.status === 'PENDING' ? 'amber' : 'gray'}>{c.status}</Pill></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2">Payouts ({detail.payouts?.length ?? 0})</h4>
                {(detail.payouts?.length ?? 0) === 0 ? (
                  <p className="text-xs text-subtle-foreground">No payouts yet.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wider text-subtle-foreground">
                        <tr className="border-b border-border">
                          <th className="py-2 px-3 font-semibold">Date</th>
                          <th className="py-2 px-3 font-semibold">Reference</th>
                          <th className="py-2 px-3 font-semibold text-right">Amount</th>
                          <th className="py-2 px-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detail.payouts!.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 text-muted-foreground text-xs">{formatDate(p.createdAt)}</td>
                            <td className="py-2 px-3 font-mono text-xs">{p.reference ?? '—'}</td>
                            <td className="py-2 px-3 text-right font-semibold text-secondary">{formatCurrency(p.amount)}</td>
                            <td className="py-2 px-3"><Pill tone={p.status === 'COMPLETED' ? 'green' : 'amber'}>{p.status}</Pill></td>
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
      <Modal open={!!editing} title="Edit Agent" onClose={() => setEditing(null)}>
        {formError && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
        {editing && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <input className="input-field" placeholder="Full Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            <input className="input-field" placeholder="Phone" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <input className="input-field" type="email" placeholder="Email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
              Account active
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 btn-navy">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleting} title="Delete Agent" onClose={() => setDeleting(null)}>
        <p className="text-sm text-muted-foreground mb-4">
          This will permanently deactivate <strong>{deleting?.name}</strong> (AGAC-{deleting?.username}) and disable their login.
          Businesses they onboarded are not affected.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setDeleting(null)} className="flex-1 btn-outline">
            Cancel
          </button>
          <button type="button" onClick={handleDelete} className="flex-1 btn-navy bg-danger">
            Delete Agent
          </button>
        </div>
      </Modal>

      {/* New agent credentials */}
      <Modal open={!!createdCreds} title="Agent Login Credentials" onClose={() => setCreatedCreds(null)}>
        {createdCreds && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Give these to the agent — they have also been sent to the agent's phone automatically by SMS
              {createdCreds.phone ? ` (${createdCreds.phone})` : ''}.
            </p>
            <CredRow label="How to sign in" value='Open the app → choose "Agent"' />
            <CredRow label="Username" value={createdCreds.username} onCopy={() => copy(createdCreds.username)} />
            <CredRow label="Password" value={createdCreds.password} mono onCopy={() => copy(createdCreds.password)} />
            <button
              onClick={() => copy(`Agent login\nUsername: ${createdCreds.username}\nPassword: ${createdCreds.password}`)}
              className="btn-navy w-full"
            >
              Copy credentials
            </button>
            <button onClick={() => setCreatedCreds(null)} className="btn-outline w-full">Done</button>
          </div>
        )}
      </Modal>

      {/* Reset password result */}
      <Modal open={!!resetCreds} title="New Agent Password" onClose={() => setResetCreds(null)}>
        {resetCreds && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">The agent's password was reset and the new password was sent to their phone by SMS.</p>
            <CredRow label="Username" value={resetCreds.username} onCopy={() => copy(resetCreds.username)} />
            <CredRow label="New password" value={resetCreds.password} mono onCopy={() => copy(resetCreds.password)} />
            <button
              onClick={() => copy(`Agent login\nUsername: ${resetCreds.username}\nPassword: ${resetCreds.password}`)}
              className="btn-navy w-full"
            >
              Copy credentials
            </button>
            <button onClick={() => setResetCreds(null)} className="btn-outline w-full">Done</button>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}

function CredRow({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">{label}</p>
        <p className={`truncate ${mono ? 'font-mono' : 'font-semibold'} text-foreground`}>{value}</p>
      </div>
      {onCopy && (
        <button type="button" onClick={onCopy} className="shrink-0 text-xs font-medium text-secondary hover:underline">
          Copy
        </button>
      )}
    </div>
  );
}
