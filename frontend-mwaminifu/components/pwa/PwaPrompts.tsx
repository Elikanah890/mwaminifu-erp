'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, RefreshCw, Share, X } from 'lucide-react';
import { usePwa } from '@/lib/context/PwaContext';
import { useI18n } from '@/lib/context/I18nContext';

export default function PwaPrompts() {
  const { canInstall, isIos, installed, dismissed, promptInstall, dismissInstall, updateReady, updateNow, updateLater } = usePwa();
  const { locale } = useI18n();
  const [iosHint, setIosHint] = useState(false);
  const sw = locale === 'sw';

  const showInstall = !installed && !dismissed && (canInstall || isIos);

  return (
    <>
      {/* Update available */}
      <AnimatePresence>
        {updateReady && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 bottom-4 z-[190] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-sidebar p-4 text-white shadow-2xl sm:left-auto sm:right-6 sm:mx-0"
            role="status"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#5eead4]">
              <RefreshCw size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{sw ? 'Toleo jipya linapatikana' : 'New version available'}</p>
              <p className="text-xs text-white/60">{sw ? 'Sasisha ili upate maboresho mapya.' : 'Update to get the latest improvements.'}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={updateLater} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10">
                {sw ? 'Baadaye' : 'Later'}
              </button>
              <button onClick={updateNow} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
                {sw ? 'Sasisha' : 'Update'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install */}
      <AnimatePresence>
        {showInstall && !updateReady && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 bottom-4 z-[180] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl sm:left-auto sm:right-6 sm:mx-0"
            role="dialog"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Download size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{sw ? 'Sakinisha Mwaminifu' : 'Install Mwaminifu'}</p>
              <p className="text-xs text-muted-foreground">
                {sw ? 'Ongeza kwenye kifaa chako kwa ufikiaji wa haraka.' : 'Add to your device for quick access.'}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-danger">
                {sw
                  ? 'Data huhifadhiwa kwenye kifaa hiki kwa matumizi nje ya mtandao. Tumia "Safisha data" ukishatoka.'
                  : 'Data is stored on this device for offline use. Use “Clear offline data” after signing out.'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => (canInstall ? promptInstall() : setIosHint((v) => !v))}
                className="btn-gold px-3 py-1.5 text-xs"
              >
                {sw ? 'Sakinisha' : 'Install'}
              </button>
              <button onClick={dismissInstall} aria-label="Dismiss" className="rounded-lg p-1.5 text-subtle-foreground hover:bg-muted">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS inline hint */}
      <AnimatePresence>
        {showInstall && iosHint && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-4 bottom-24 z-[185] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 text-sm shadow-2xl sm:left-auto sm:right-6 sm:mx-0"
          >
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <Share size={16} className="text-secondary" />
              {sw ? 'Bonyeza Share kisha "Ongeza kwenye Home Screen"' : 'Tap Share, then "Add to Home Screen"'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
