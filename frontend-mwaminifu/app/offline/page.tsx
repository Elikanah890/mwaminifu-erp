'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { RefreshCw, WifiOff, Home } from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';

export default function OfflinePage() {
  const { locale, setLocale } = useI18n();
  const sw = locale === 'sw';

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="navy-panel relative overflow-hidden rounded-3xl p-8 text-center shadow-2xl">
          <div className="gradient-mesh pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-white/20">
              <Image src="/logo.jpeg" alt="Mwaminifu" width={56} height={56} className="h-14 w-14 object-cover" />
            </span>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70">
              <WifiOff size={13} /> {sw ? 'Bila mtandao' : 'Offline'}
            </div>
            <h1 className="text-2xl font-semibold text-white">{sw ? 'Hakuna mtandao' : 'You are offline'}</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-white/70">
              {sw
                ? 'Hauna muunganisho wa intaneti kwa sasa. Data uliyoiweka awali inaweza kuonekana. Unapopata mtandao, taarifa zitasawazishwa.'
                : 'You have no internet connection right now. Previously loaded data may still be available. Once you reconnect, your data will sync.'}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button onClick={() => window.location.reload()} className="btn-gold px-5 py-2.5">
                <RefreshCw size={16} /> {sw ? 'Jaribu tena' : 'Retry'}
              </button>
              <Link href="/" className="rounded-[10px] border border-white/25 px-5 py-2.5 font-semibold text-white transition-brand hover:bg-white/10">
                <span className="inline-flex items-center gap-2">
                  <Home size={16} /> {sw ? 'Nyumbani' : 'Home'}
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>Mwaminifu ERP</span>
          <span className="text-border-strong">·</span>
          <button onClick={() => setLocale(sw ? 'en' : 'sw')} className="font-semibold text-secondary hover:underline">
            {sw ? 'English' : 'Kiswahili'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
