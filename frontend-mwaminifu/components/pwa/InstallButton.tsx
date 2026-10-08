'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share, Plus, MonitorUp } from 'lucide-react';
import { usePwa } from '@/lib/context/PwaContext';
import { useI18n } from '@/lib/context/I18nContext';
import Modal from '@/components/Modal';

export default function InstallButton({ onDark = false }: { onDark?: boolean }) {
  const { canInstall, isIos, installed, promptInstall } = usePwa();
  const { locale } = useI18n();
  const [showIos, setShowIos] = useState(false);

  if (installed) return null;
  if (!canInstall && !isIos) return null;

  const sw = locale === 'sw';
  const label = sw ? 'Sakinisha' : 'Install';

  const handleClick = () => {
    if (canInstall) {
      promptInstall();
    } else {
      setShowIos(true);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-brand sm:flex ${
          onDark ? 'text-white/85 hover:bg-white/10 hover:text-white' : 'text-foreground hover:bg-muted'
        }`}
      >
        <Download size={16} />
        <span className="hidden lg:inline">{label}</span>
      </motion.button>

      <Modal open={showIos} title={sw ? 'Sakinisha Mwaminifu' : 'Install Mwaminifu'} onClose={() => setShowIos(false)}>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            {sw
              ? 'Ili kusakinisha kwenye iPhone au iPad, fuata hatua hizi:'
              : 'To install on iPhone or iPad, follow these steps:'}
          </p>
          <ol className="space-y-3">
            <li className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Share size={18} />
              </span>
              <span>
                <span className="font-semibold text-foreground">{sw ? 'Bonyeza Share' : 'Tap the Share button'}</span>
                <span className="block text-muted-foreground">{sw ? 'Kwenye kivinjari cha Safari' : 'In the Safari toolbar'}</span>
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Plus size={18} />
              </span>
              <span>
                <span className="font-semibold text-foreground">
                  {sw ? 'Chagua "Ongeza kwenye Home Screen"' : 'Choose "Add to Home Screen"'}
                </span>
                <span className="block text-muted-foreground">{sw ? 'Kisha bonyeza Add' : 'Then tap Add'}</span>
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-border bg-muted p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <MonitorUp size={18} />
              </span>
              <span>
                <span className="font-semibold text-foreground">{sw ? 'Fungua kama app' : 'Open it like an app'}</span>
                <span className="block text-muted-foreground">
                  {sw ? 'Itafunguka bila browser bar' : 'It launches without the browser bar'}
                </span>
              </span>
            </li>
          </ol>
          <button onClick={() => setShowIos(false)} className="btn-navy w-full">
            {sw ? 'Nimeelewa' : 'Got it'}
          </button>
        </div>
      </Modal>
    </>
  );
}
