'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { formatDateTime, errorMessage } from '@/lib/format';
import Modal from '@/components/Modal';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import PageWrapper from '@/components/PageWrapper';
import { Reveal, motion } from '@/components/motion';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function SystemNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const [showSend, setShowSend] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all_owners');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<NotificationItem[]>('/notifications');
      if (res.data) setNotifications(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notify) return;
    const t = setTimeout(() => setNotify(''), 4000);
    return () => clearTimeout(t);
  }, [notify]);

  const markRead = async (id: string) => {
    setBusyId(id);
    try {
      await apiClient.put(`/notifications/${id}/read`, {});
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
      await apiClient.put('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setNotify('All notifications marked as read');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await apiClient.post<{ recipients: number }>('/admin/notifications', {
        title: title.trim(),
        body: body.trim(),
        target,
      });
      setNotify(`Notification sent to ${res.data?.recipients ?? 0} recipient(s)`);
      setShowSend(false);
      setTitle('');
      setBody('');
      setTarget('all_owners');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <PageWrapper title="Notifications" description="Send and manage platform notifications" breadcrumb={['System', 'Notifications']} actions={<>
          <motion.button onClick={() => setShowSend(true)} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-gold">+ Send Notification</motion.button>
          <motion.button onClick={load} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="btn-outline">Refresh</motion.button>
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
          <EmptyState message="No notifications yet" />
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
        </Reveal>
      )}

      <Modal open={showSend} title="Send Notification" onClose={() => setShowSend(false)}>
        <form onSubmit={sendNotification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Recipients</label>
            <select className="input-field" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="all_owners">All Business Owners</option>
              <option value="all_agents">All Agents</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Body</label>
            <textarea className="input-field min-h-[100px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification message" required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowSend(false)} className="flex-1 btn-outline">Cancel</button>
            <button type="submit" disabled={sending} className="flex-1 btn-gold">
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
