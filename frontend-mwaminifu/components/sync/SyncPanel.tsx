'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, RotateCcw, CloudUpload } from 'lucide-react';
import Modal from '@/components/Modal';
import { useSync } from '@/lib/context/SyncContext';
import { useI18n } from '@/lib/context/I18nContext';
import { getSyncEngine } from '@/lib/offline/sync-engine';
import { allItems } from '@/lib/offline/queue';
import type { OutboxItem } from '@/lib/offline/db';

export default function SyncPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const snap = useSync();
  const { locale } = useI18n();
  const sw = locale === 'sw';
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      const rows = await allItems();
      if (active) setItems(rows as OutboxItem[]);
    };
    load();
    const interval = setInterval(load, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [open]);

  const engine = getSyncEngine();
  const pending = items.filter((i) => i.status === 'pending');
  const failed = items.filter((i) => i.status === 'failed');

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      setItems((await allItems()) as OutboxItem[]);
    }
  };

  const label = (item: OutboxItem) => {
    const parts = item.endpoint.split('/').filter(Boolean);
    const entity = item.entity || parts[parts.length - 1] || 'item';
    return `${item.method} ${entity}`;
  };

  return (
    <Modal open={open} title={sw ? 'Usawazishaji' : 'Sync'} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Stat label={sw ? 'Zinasubiri' : 'Pending'} value={pending.length} tone="amber" icon={<Clock size={16} />} />
          <Stat label={sw ? 'Zimeshindwa' : 'Failed'} value={failed.length} tone="red" icon={<AlertTriangle size={16} />} />
          <Stat
            label={sw ? 'Hali' : 'Status'}
            value={snap.status}
            tone={snap.status === 'online' ? 'green' : snap.status === 'offline' ? 'amber' : snap.status === 'syncing' ? 'blue' : 'red'}
            icon={<CloudUpload size={16} />}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {snap.lastSyncAt
            ? `${sw ? 'Iliyosasishwa mwisho' : 'Last synced'}: ${new Date(snap.lastSyncAt).toLocaleString()}`
            : sw
              ? 'Bado haijasawazishwa'
              : 'Not synced yet'}
        </p>

        <div className="flex flex-wrap gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => run(() => engine.syncNow())} disabled={busy || snap.status === 'offline'} className="btn-navy">
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} /> {sw ? 'Sawazisha Sasa' : 'Sync Now'}
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => run(() => engine.retryFailed())} disabled={busy || failed.length === 0} className="btn-outline">
            <RotateCcw size={15} /> {sw ? 'Jaribu Zilizoshindwa' : 'Retry Failed'}
          </motion.button>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckCircle2 size={28} className="text-success" />
              <p className="text-sm font-medium text-foreground">{sw ? 'Kila kitu kimesawazishwa' : 'Everything is synced'}</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    item.status === 'failed' ? 'bg-danger' : 'bg-warning'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{label(item)}</p>
                  <p className="truncate text-xs text-subtle-foreground">
                    {new Date(item.createdAt).toLocaleTimeString()}
                    {item.attempts > 0 ? ` · ${sw ? 'majaribio' : 'attempts'} ${item.attempts}` : ''}
                    {item.lastError ? ` · ${item.lastError}` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    item.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                  }`}
                >
                  {item.status === 'failed' ? (sw ? 'Imeshindwa' : 'Failed') : sw ? 'Inasubiri' : 'Pending'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  tone: 'amber' | 'red' | 'green' | 'blue';
  icon: ReactNode;
}) {
  const tones = {
    amber: 'bg-warning/10 text-warning',
    red: 'bg-danger/10 text-danger',
    green: 'bg-success/10 text-success',
    blue: 'bg-secondary/10 text-secondary',
  } as const;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</span>
      <p className="mt-2 text-lg font-semibold capitalize text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
