'use client';

import { motion } from 'framer-motion';
import { Tag } from 'lucide-react';
import Modal from '@/components/Modal';
import { useSync } from '@/lib/context/SyncContext';
import { useI18n } from '@/lib/context/I18nContext';
import { getSyncEngine } from '@/lib/offline/sync-engine';

/** Informational dialog when a product price changed on the server while offline. */
export default function ConflictDialog() {
  const snap = useSync();
  const { locale } = useI18n();
  const sw = locale === 'sw';
  const conflicts = snap.conflicts;

  return (
    <Modal
      open={conflicts.length > 0}
      title={sw ? 'Bei imebadilika' : 'Price changed'}
      onClose={() => getSyncEngine().dismissConflicts()}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {sw
            ? 'Bidhaa zifuatazo zilibadilisha bei mtandaoni wakati haukuwa na mtandao. Mauzo yajayo yatatumia bei mpya.'
            : 'The following products changed price while you were offline. Future sales will use the new price.'}
        </p>
        <ul className="space-y-2">
          {conflicts.map((c) => (
            <li key={c.productId} className="flex items-center gap-3 rounded-xl border border-border bg-muted p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-[#9a7b1f] dark:text-[#E3C25A]">
                <Tag size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.from.toLocaleString()} → <span className="font-semibold text-foreground">{c.to.toLocaleString()}</span> TZS
                </p>
              </div>
            </li>
          ))}
        </ul>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => getSyncEngine().dismissConflicts()}
          className="btn-navy w-full"
        >
          {sw ? 'Sawa, nimekubali' : 'Got it'}
        </motion.button>
      </div>
    </Modal>
  );
}
