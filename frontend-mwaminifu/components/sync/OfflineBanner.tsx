'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useSync } from '@/lib/context/SyncContext';
import { useI18n } from '@/lib/context/I18nContext';

export default function OfflineBanner() {
  const { status, pending } = useSync();
  const { locale } = useI18n();
  const offline = status === 'offline';

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-[#F59E0B] px-4 py-2 text-center text-xs font-semibold text-[#1A2A3A] sm:text-sm"
          role="status"
        >
          <WifiOff size={15} />
          {locale === 'sw'
            ? `Hauna mtandao. Kila kitu kinaendelea kufanya kazi. Tutasawazisha kiotomatiki${pending > 0 ? ` (${pending})` : ''}.`
            : `You're offline. Everything still works. We'll sync automatically${pending > 0 ? ` (${pending})` : ''}.`}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
