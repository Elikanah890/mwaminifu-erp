'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { formatDateTime, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import { Reveal, MotionCard, motion } from '@/components/motion';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface TicketMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface TicketThread {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  messages: TicketMessage[];
}

const PER_PAGE = 10;

export default function AgentSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: PER_PAGE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState('');

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [creating, setCreating] = useState(false);

  const [thread, setThread] = useState<TicketThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);

  const currentUserId = apiClient.getUser()?.id;

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      const res = await apiClient.get<Ticket[]>(`/agents/support?${params.toString()}`);
      if (res.data) setTickets(res.data);
      if (res.pagination) setMeta(res.pagination);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  useEffect(() => {
    if (!notify) return;
    const t = setTimeout(() => setNotify(''), 4000);
    return () => clearTimeout(t);
  }, [notify]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotify('');
    setCreating(true);
    try {
      await apiClient.post('/agents/support', { subject: subject.trim(), message: message.trim(), priority });
      setSubject('');
      setMessage('');
      setPriority('MEDIUM');
      setNotify('Support ticket created successfully');
      load(1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const openThread = async (id: string) => {
    setThreadLoading(true);
    setError('');
    try {
      const res = await apiClient.get<TicketThread>(`/agents/support/${id}/messages`);
      if (res.data) setThread(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setThreadLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread || !reply.trim()) return;
    setReplying(true);
    setError('');
    try {
      await apiClient.post(`/agents/support/${thread.id}/messages`, { content: reply.trim() });
      setReply('');
      const res = await apiClient.get<TicketThread>(`/agents/support/${thread.id}/messages`);
      if (res.data) setThread(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setReplying(false);
    }
  };

  const statusBadge = (status: string) =>
    status === 'OPEN' ? (
      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">Open</span>
    ) : (
      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">Closed</span>
    );

  return (
    <PageWrapper title="Support" description="Get help from the platform team" breadcrumb={['Agent', 'Support']}>

      {notify && <div className="bg-success/10 border border-success/25 text-secondary px-4 py-3 rounded-lg mb-4 text-sm">{notify}</div>}
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <MotionCard className="surface-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Create a Ticket</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              className="input-field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              className="input-field min-h-[100px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue in detail"
              required
            />
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
              <select className="input-field" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <motion.button type="submit" disabled={creating} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-gold">
              {creating ? 'Submitting...' : 'Submit Ticket'}
            </motion.button>
          </div>
        </form>
      </MotionCard>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} />
      ) : (
      <Reveal className="surface-card overflow-hidden">
        <h2 className="text-lg font-semibold text-primary px-6 pt-5 pb-3">My Tickets</h2>
        {tickets.length === 0 ? (
          <EmptyState message="No support tickets yet" />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
              <tr className="border-b border-border">
                <th className="py-3 px-6 font-semibold">Subject</th>
                <th className="py-3 px-6 font-semibold">Priority</th>
                <th className="py-3 px-6 font-semibold">Status</th>
                <th className="py-3 px-6 font-semibold">Created</th>
                <th className="py-3 px-6 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-muted">
                  <td className="py-3 px-6 font-medium text-foreground">{t.subject}</td>
                  <td className="py-3 px-6 text-muted-foreground">{t.priority}</td>
                  <td className="py-3 px-6">{statusBadge(t.status)}</td>
                  <td className="py-3 px-6 text-muted-foreground text-xs">{formatDateTime(t.createdAt)}</td>
                  <td className="py-3 px-6 text-right">
                    <button onClick={() => openThread(t.id)} className="text-xs text-secondary font-medium hover:underline">
                      View
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

      <Modal open={!!thread} title={thread ? thread.subject : 'Ticket'} onClose={() => setThread(null)} wide>
        {threadLoading ? (
          <SkeletonCard rows={4} />
        ) : thread ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {statusBadge(thread.status)}
              <span className="text-xs text-muted-foreground">Priority: {thread.priority}</span>
              <span className="text-xs text-muted-foreground">Created {formatDateTime(thread.createdAt)}</span>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto border border-border rounded-lg p-4 bg-muted">
              {thread.messages.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                        mine ? 'bg-secondary text-white' : 'bg-card border border-border text-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-subtle-foreground'}`}>{formatDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {thread.status === 'OPEN' ? (
              <form onSubmit={handleReply} className="flex gap-3">
                <input
                  className="input-field flex-1"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                />
                <motion.button type="submit" disabled={replying || !reply.trim()} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-teal shrink-0 disabled:opacity-40">
                  {replying ? 'Sending...' : 'Reply'}
                </motion.button>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground text-center">This ticket is closed.</p>
            )}
          </div>
        ) : null}
      </Modal>
    </PageWrapper>
  );
}
