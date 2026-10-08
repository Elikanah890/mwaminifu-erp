'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useSync } from '@/lib/context/SyncContext';
import { useI18n } from '@/lib/context/I18nContext';
import SyncPanel from '@/components/sync/SyncPanel';

export default function SyncStatusButton({ onDark = false }: { onDark?: boolean }) {
  const snap = useSync();
  const { locale } = useI18n();
  const sw = locale === 'sw';
  const [open, setOpen] = useState(false);

  const dot =
    snap.status === 'offline'
      ? 'bg-warning'
      : snap.status === 'syncing'
        ? 'bg-secondary'
        : snap.status === 'failed'
          ? 'bg-danger'
          : 'bg-success';

  const label =
    snap.status === 'offline'
      ? `${sw ? 'Bila mtandao' : 'Offline'}${snap.pending ? ` • ${snap.pending}` : ''}`
      : snap.status === 'syncing'
        ? sw
          ? 'Inasawazisha…'
          : 'Syncing…'
        : snap.status === 'failed'
          ? `${sw ? 'Usawazishaji umeshindwa' : 'Sync failed'}${snap.failed ? ` • ${snap.failed}` : ''}`
          : snap.pending
            ? `${sw ? 'Mtandaoni' : 'Online'} • ${snap.pending}`
            : sw
              ? 'Mtandaoni'
              : 'Online';

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold transition-brand ${
          onDark ? 'text-white/85 hover:bg-white/10' : 'text-foreground hover:bg-muted'
        }`}
        title={sw ? 'Hali ya usawazishaji' : 'Sync status'}
      >
        <span className="relative flex h-2.5 w-2.5">
          {(snap.status === 'offline' || snap.status === 'failed') && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dot} opacity-60`} />
          )}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
        </span>
        <span className="hidden sm:inline">{label}</span>
        {snap.status === 'syncing' && <RefreshCw size={12} className="animate-spin" />}
      </motion.button>
      <SyncPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
