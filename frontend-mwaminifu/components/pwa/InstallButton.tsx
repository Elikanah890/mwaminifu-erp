'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share, Plus, MonitorUp, MoreVertical } from 'lucide-react';
import { usePwa } from '@/lib/context/PwaContext';
import { useI18n } from '@/lib/context/I18nContext';
import Modal from '@/components/Modal';

export default function InstallButton({ onDark = false }: { onDark?: boolean }) {
  const { canInstall, isIos, installed, promptInstall } = usePwa();
  const { locale } = useI18n();
  const [showHelp, setShowHelp] = useState(false);

  // Only hide once the app is actually installed. Before that we ALWAYS show the
  // install entry point — if the browser hasn't offered a native prompt yet
  // (Chrome needs a moment / engagement, Firefox never does), we fall back to
  // step-by-step instructions instead of showing nothing.
  if (installed) return null;

  const sw = locale === 'sw';
  const label = sw ? 'Sakinisha' : 'Install';

  const handleClick = () => {
    if (canInstall) {
      void promptInstall();
    } else {
      setShowHelp(true);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        aria-label={sw ? 'Sakinisha Mwaminifu' : 'Install Mwaminifu'}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-brand ${
          onDark ? 'text-white/85 hover:bg-white/10 hover:text-white' : 'text-foreground hover:bg-muted'
        }`}
      >
        <Download size={16} />
        <span className="hidden lg:inline">{label}</span>
      </motion.button>

      <Modal
        open={showHelp}
        title={sw ? 'Sakinisha Mwaminifu' : 'Install Mwaminifu'}
        onClose={() => setShowHelp(false)}
      >
        <div className="space-y-4 text-sm">
          {isIos ? (
            <>
              <p className="text-muted-foreground">
                {sw ? 'Kwenye iPhone/iPad (Safari):' : 'On iPhone / iPad (Safari):'}
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary"><Share size={18} /></span>
                  <span>
                    <span className="font-semibold text-foreground">{sw ? 'Bonyeza Share' : 'Tap the Share button'}</span>
                    <span className="block text-muted-foreground">{sw ? 'Kwenye toolbar ya Safari' : 'In the Safari toolbar'}</span>
                  </span>
                </li>
                <li className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary"><Plus size={18} /></span>
                  <span>
                    <span className="font-semibold text-foreground">{sw ? 'Chagua "Ongeza kwenye Home Screen"' : 'Choose "Add to Home Screen"'}</span>
                    <span className="block text-muted-foreground">{sw ? 'Kisha bonyeza Add' : 'Then tap Add'}</span>
                  </span>
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                {sw
                  ? 'Kwenye Chrome, Edge au Safari (kompyuta/Android):'
                  : 'On Chrome, Edge or Safari (desktop / Android):'}
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary"><Download size={18} /></span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {sw ? 'Bonyeza aikoni ya kusakinisha' : 'Click the install icon'}
                    </span>
                    <span className="block text-muted-foreground">
                      {sw ? 'Kwenye upande wa kulia wa address bar' : 'On the right side of the address bar'}
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary"><MoreVertical size={18} /></span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {sw ? 'Au fungua menu ya browser' : 'Or open the browser menu (⋮)'}
                    </span>
                    <span className="block text-muted-foreground">
                      {sw ? 'Kisha chagua "Install Mwaminifu" / "Ongeza kwenye Home screen"' : 'Then choose "Install Mwaminifu" / "Add to Home screen"'}
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary"><MonitorUp size={18} /></span>
                  <span>
                    <span className="font-semibold text-foreground">{sw ? 'Fungua kama app' : 'Open it like an app'}</span>
                    <span className="block text-muted-foreground">
                      {sw ? 'Itafunguka bila browser bar' : 'It launches without the browser bar'}
                    </span>
                  </span>
                </li>
              </ol>
              <p className="text-xs text-subtle-foreground">
                {sw
                  ? 'Kama huoni chaguo la kusakinisha, tumia Chrome au Edge (Firefox haitumii PWA).'
                  : 'If no install option appears, use Chrome or Edge (Firefox does not support PWA install).'}
              </p>
            </>
          )}
          <button onClick={() => setShowHelp(false)} className="btn-navy w-full">
            {sw ? 'Nimeelewa' : 'Got it'}
          </button>
        </div>
      </Modal>
    </>
  );
}
