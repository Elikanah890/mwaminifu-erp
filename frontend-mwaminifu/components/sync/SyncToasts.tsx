'use client';

import { useEffect, useRef } from 'react';
import { useSync } from '@/lib/context/SyncContext';
import { useI18n } from '@/lib/context/I18nContext';
import { useToast } from '@/components/Toast';

/** Emits toasts when connectivity returns and when a sync run completes. */
export default function SyncToasts() {
  const snap = useSync();
  const { locale } = useI18n();
  const { toast } = useToast();
  const prev = useRef({ status: snap.status, pending: snap.pending });

  useEffect(() => {
    const before = prev.current;
    prev.current = { status: snap.status, pending: snap.pending };

    // Came back online
    if (before.status === 'offline' && snap.status !== 'offline') {
      if (snap.pending > 0) {
        toast(
          locale === 'sw'
            ? `Umerudi mtandaoni! Inasawazisha mabadiliko ${snap.pending}...`
            : `Back online! Syncing ${snap.pending} change${snap.pending === 1 ? '' : 's'}...`,
          'info'
        );
      } else {
        toast(locale === 'sw' ? 'Umerudi mtandaoni' : "You're back online", 'success');
      }
      return;
    }

    // Finished syncing with nothing left
    if (before.status === 'syncing' && snap.status === 'online' && snap.pending === 0 && before.pending > 0) {
      toast(locale === 'sw' ? 'Mabadiliko yote yamesawazishwa' : 'All changes synced', 'success');
    }

    // New failures
    if (snap.failed > before.pending && snap.failed > 0 && snap.status === 'failed') {
      toast(
        locale === 'sw' ? 'Baadhi ya mabadiliko yameshindwa kusawazishwa' : 'Some changes failed to sync',
        'error'
      );
    }
  }, [snap.status, snap.pending, snap.failed, locale, toast]);

  return null;
}
