'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { formatDateTime, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import PageWrapper from '@/components/PageWrapper';
import { Reveal, motion } from '@/components/motion';

interface TicketUser {
  id: string;
  name: string;
  phone: string | null;
  role: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assignedTo?: string | null;
  assignee?: { id: string; name: string; username?: string } | null;
  user?: TicketUser | null;
  shop?: { id: string; name: string } | null;
  _count?: { messages: number };
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: { id: string; name: string; role: string } | null;
}

interface TicketDetail extends Ticket {
  messages: TicketMessage[];
}

interface AgentOption {
  id: string;
  username: string;
  name: string;
  isActive: boolean;
}

const PER_PAGE = 10;

const STATUS_BADGE: Record<string, 'amber' | 'teal' | 'gray'> = {
  OPEN: 'amber',
  RESOLVED: 'teal',
  CLOSED: 'gray',
};

function statusPill(status: string) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  const tone = STATUS_BADGE[status] ?? 'gray';
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${tone === 'amber' ? 'bg-warning/10 text-warning' : tone === 'teal' ? 'bg-secondary/10 text-secondary' : 'bg-muted-2 text-muted-foreground'}`}>{label}</span>;
}

function priorityPill(priority: string) {
  const tone = priority === 'URGENT' ? 'bg-danger/10 text-danger' : priority === 'HIGH' ? 'bg-warning/10 text-warning' : 'bg-muted-2 text-muted-foreground';
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${tone}`}>{priority}</span>;
}

function roleLabel(role?: string) {
  if (role === 'AGENT') return 'Agent';
  if (role === 'BUSINESS_OWNER') return 'Business Owner';
  if (role === 'SYSTEM_OWNER') return 'System Owner';
  if (role === 'EMPLOYEE') return 'Employee';
  return role || '-';
}

export default function SystemSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: PER_PAGE, total: 0 });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState('');

  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [assignId, setAssignId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const res = await apiClient.get<Ticket[]>(`/admin/support-tickets?${params.toString()}`);
      if (res.data) setTickets(res.data);
      if (res.pagination) setMeta(res.pagination);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    apiClient.get<AgentOption[]>('/admin/agents?limit=100').then((res) => {
      if (res.data) setAgents(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!notify) return;
    const t = setTimeout(() => setNotify(''), 4000);
    return () => clearTimeout(t);
  }, [notify]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setError('');
    setReply('');
    setAssignId('');
    try {
      const res = await apiClient.get<TicketDetail>(`/admin/support-tickets/${id}`);
      if (res.data) setDetail(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detail) return;
    const res = await apiClient.get<TicketDetail>(`/admin/support-tickets/${detail.id}`);
    if (res.data) setDetail(res.data);
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !reply.trim()) return;
    setReplying(true);
    setError('');
    try {
      await apiClient.post(`/admin/support-tickets/${detail.id}/messages`, { content: reply.trim() });
      setReply('');
      await refreshDetail();
      setNotify('Reply sent');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setReplying(false);
    }
  };

  const changeStatus = async (newStatus: string) => {
    if (!detail) return;
    setError('');
    try {
      await apiClient.put(`/admin/support-tickets/${detail.id}/status`, { status: newStatus });
      await refreshDetail();
      load(meta.page);
      setNotify(`Ticket ${newStatus.toLowerCase()}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const assignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !assignId) return;
    setAssigning(true);
    setError('');
    try {
      await apiClient.put(`/admin/support-tickets/${detail.id}/assign`, { assignedTo: assignId });
      await refreshDetail();
      setAssignId('');
      setNotify('Ticket assigned');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <PageWrapper title="Support Center" description="Manage and respond to support tickets" breadcrumb={['System', 'Support']}>

      {notify && <div className="bg-success/10 border border-success/25 text-secondary px-4 py-3 rounded-lg mb-4 text-sm">{notify}</div>}
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Reveal className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="input-field max-w-xs"
          placeholder="Search subject, message, name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); load(1); }}
        />
        <select className="input-field max-w-[180px]" value={status} onChange={(e) => { setStatus(e.target.value); load(1); }}>
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </Reveal>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} />
      ) : tickets.length === 0 ? (
        <Reveal><div className="surface-card">
          <EmptyState message="No support tickets found" />
        </div></Reveal>
      ) : (
        <Reveal className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 px-6 font-semibold">ID</th>
                  <th className="py-3 px-6 font-semibold">Subject</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold">Priority</th>
                  <th className="py-3 px-6 font-semibold">Created By</th>
                  <th className="py-3 px-6 font-semibold">Assigned To</th>
                  <th className="py-3 px-6 font-semibold">Msgs</th>
                  <th className="py-3 px-6 font-semibold">Created</th>
                  <th className="py-3 px-6 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-muted">
                    <td className="py-3 px-6 text-subtle-foreground text-xs">{t.id.slice(0, 8)}</td>
                    <td className="py-3 px-6 font-medium text-foreground">{t.subject}</td>
                    <td className="py-3 px-6">{statusPill(t.status)}</td>
                    <td className="py-3 px-6">{priorityPill(t.priority)}</td>
                    <td className="py-3 px-6 text-muted-foreground">
                      {t.user ? `${t.user.name} · ${roleLabel(t.user.role)}` : '-'}
                    </td>
                    <td className="py-3 px-6 text-muted-foreground">{t.assignee?.name ?? '-'}</td>
                    <td className="py-3 px-6 text-muted-foreground">{t._count?.messages ?? 0}</td>
                    <td className="py-3 px-6 text-muted-foreground text-xs">{formatDateTime(t.createdAt)}</td>
                    <td className="py-3 px-6 text-right">
                      <button onClick={() => openDetail(t.id)} className="text-xs text-secondary font-medium hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-border">
            <Pagination page={meta.page} total={meta.total} limit={PER_PAGE} onPageChange={load} />
          </div>
        </Reveal>
      )}

      <Modal open={!!detail} title={detail ? detail.subject : 'Ticket'} onClose={() => setDetail(null)} wide>
        {detailLoading ? (
          <SkeletonCard rows={4} />
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {statusPill(detail.status)}
              {priorityPill(detail.priority)}
              <span className="text-muted-foreground">
                By <strong className="text-foreground">{detail.user?.name ?? '-'}</strong> ({roleLabel(detail.user?.role)})
              </span>
              <span className="text-muted-foreground">Assigned: {detail.assignee?.name ?? 'Unassigned'}</span>
              <span className="text-subtle-foreground text-xs">{formatDateTime(detail.createdAt)}</span>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto border border-border rounded-lg p-4 bg-muted">
              {detail.messages.length === 0 ? (
                <p className="text-sm text-subtle-foreground text-center">No messages</p>
              ) : (
                detail.messages.map((m) => (
                  <div key={m.id} className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary">{m.sender?.name ?? 'Support'}</span>
                      <span className="text-[10px] text-subtle-foreground">{roleLabel(m.sender?.role)}</span>
                      <span className="text-[10px] text-subtle-foreground">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <div className="bg-card border border-border rounded-lg px-4 py-2 text-sm text-foreground">
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {detail.status === 'CLOSED' ? (
              <p className="text-xs text-muted-foreground text-center">This ticket is closed.</p>
            ) : (
              <form onSubmit={sendReply} className="flex gap-3">
                <input
                  className="input-field flex-1"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                />
                <motion.button
                  type="submit"
                  disabled={replying || !reply.trim()}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="btn-teal shrink-0 disabled:opacity-40"
                >
                  {replying ? 'Sending...' : 'Reply'}
                </motion.button>
              </form>
            )}

            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <form onSubmit={assignTicket} className="flex items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Assign to Agent</label>
                  <select className="input-field min-w-[200px]" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
                    <option value="">— Select agent —</option>
                    {agents.filter((a) => a.isActive).map((a) => (
                      <option key={a.id} value={a.id}>{a.name} (@{a.username})</option>
                    ))}
                  </select>
                </div>
                <motion.button
                  type="submit"
                  disabled={assigning || !assignId}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="btn-navy disabled:opacity-40"
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </motion.button>
              </form>

              <div className="ml-auto flex gap-2">
                {detail.status !== 'RESOLVED' && detail.status !== 'CLOSED' && (
                  <motion.button onClick={() => changeStatus('RESOLVED')} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-teal">Resolve</motion.button>
                )}
                {detail.status === 'OPEN' && (
                  <motion.button onClick={() => changeStatus('CLOSED')} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-outline">Close</motion.button>
                )}
                {(detail.status === 'RESOLVED' || detail.status === 'CLOSED') && (
                  <motion.button onClick={() => changeStatus('OPEN')} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-outline">Reopen</motion.button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageWrapper>
  );
}
