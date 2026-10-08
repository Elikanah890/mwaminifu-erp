'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';

interface SessionInfo {
  id: string;
  deviceId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  expiresAt: string;
}

/**
 * Spec 4.3 — shows the AGAC Owner's active sessions (maximum 2 concurrent).
 */
export default function ActiveSessionsCard() {
  const [count, setCount] = useState<number | null>(null);
  const [max, setMax] = useState(2);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ count: number; max: number; sessions: SessionInfo[] }>('/admin/sessions')
      .then((res) => {
        if (cancelled || !res.data) return;
        setCount(res.data.count);
        setMax(res.data.max ?? 2);
        setSessions(res.data.sessions ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="surface-card">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-primary">Active Sessions</h2>
        <p className="text-xs text-subtle-foreground">
          The AGAC Owner account allows a maximum of {max} concurrent sessions. Sign out on another
          device to free a slot.
        </p>
      </div>
      <div className="px-6 py-4">
        <p className="text-sm text-muted-foreground">
          Currently active: <span className="font-semibold text-foreground">{count ?? '—'}</span> of {max}
        </p>
        {sessions.length > 0 && (
          <ul className="mt-3 space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{s.deviceId || 'Unknown device'}</span>
                {s.ipAddress ? ` · ${s.ipAddress}` : ''} · started {formatDateTime(s.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
