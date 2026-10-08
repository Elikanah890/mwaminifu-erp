'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { formatDateTime, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import PageWrapper from '@/components/PageWrapper';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import { Reveal, motion } from '@/components/motion';

interface AgentNotification {
  id: string;
  title: string;
  body: string;
  type?: string | null;
  isRead: boolean;
  isSent: boolean;
  createdAt: string;
}

const PER_PAGE = 10;

export default function AgentNotificationsPage() {
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: PER_PAGE, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      const res = await apiClient.get<AgentNotification[]>(`/agents/notifications?${params.toString()}`);
      if (res.data) setNotifications(res.data);
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

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      await apiClient.put(`/agents/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiClient.put('/agents/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setNotify('All notifications marked as read');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <PageWrapper title="Notifications" description="Updates about your account and customers" breadcrumb={['Agent', 'Notifications']} actions={<>
          <motion.button onClick={() => load(meta.page)} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-outline">Refresh</motion.button>
          <motion.button onClick={markAllRead} disabled={markingAll || unreadCount === 0} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-teal disabled:opacity-40">
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </motion.button>
        </>}>

      {notify && <div className="bg-success/10 border border-success/25 text-secondary px-4 py-3 rounded-lg mb-4 text-sm">{notify}</div>}
      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <SkeletonTable rows={6} />
      ) : notifications.length === 0 ? (
        <Reveal><div className="surface-card">
          <EmptyState message="No notifications" />
        </div></Reveal>
      ) : (
        <Reveal className="surface-card overflow-hidden">
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-4 px-6 py-4 transition-colors ${n.isRead ? 'bg-card' : 'bg-secondary/5'} hover:bg-muted`}
              >
                <span
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.isRead ? 'bg-border' : 'bg-secondary'}`}
                  title={n.isRead ? 'Read' : 'Unread'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`text-sm ${n.isRead ? 'font-medium text-foreground' : 'font-bold text-primary'}`}>{n.title}</h3>
                    <span className="text-xs text-subtle-foreground shrink-0">{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => markRead(n.id)}
                    disabled={busyId === n.id}
                    className="text-xs text-secondary font-medium hover:underline shrink-0"
                  >
                    {busyId === n.id ? '...' : 'Mark read'}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="px-6 py-3 border-t border-border">
            <Pagination page={meta.page} total={meta.total} limit={PER_PAGE} onPageChange={load} />
          </div>
        </Reveal>
      )}
    </PageWrapper>
  );
}
