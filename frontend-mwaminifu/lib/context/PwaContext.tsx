'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type PwaContextValue = {
  installed: boolean;
  canInstall: boolean;
  isIos: boolean;
  dismissed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dismissInstall: () => void;
  updateReady: boolean;
  updateNow: () => void;
  updateLater: () => void;
};

const DISMISS_KEY = 'mwaminifu_install_dismissed';
const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const ua = window.navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    setIsIos(ios);

    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      /* ignore */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    let interval: ReturnType<typeof setInterval> | undefined;
    let registration: ServiceWorkerRegistration | undefined;

    const watchForUpdates = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setUpdateReady(true);
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setUpdateReady(true);
          }
        });
      });
    };

    const onControllerChange = () => {
      if (reloadingRef.current) window.location.reload();
    };

    if ('serviceWorker' in navigator) {
      // Register in every environment so the PWA install prompt works during
      // development too. In dev the worker is tagged with `?mode=dev` so it
      // never caches Next's dev chunks (which would serve stale code).
      const isDev = process.env.NODE_ENV !== 'production';
      const swUrl = isDev ? '/sw.js?mode=dev' : '/sw.js';
      navigator.serviceWorker
        .register(swUrl, { scope: '/', updateViaCache: 'none' })
        .then((reg) => {
          registration = reg;
          watchForUpdates(reg);
          interval = setInterval(() => reg.update().catch(() => undefined), 60 * 60 * 1000);
        })
        .catch(() => undefined);
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') registration?.update().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
      if (interval) clearInterval(interval);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installEvent) return 'unavailable' as const;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'dismissed') {
      setDismissed(true);
      try {
        window.localStorage.setItem(DISMISS_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    setInstallEvent(null);
    return choice.outcome;
  }, [installEvent]);

  const dismissInstall = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const updateNow = useCallback(() => {
    reloadingRef.current = true;
    waitingWorker?.postMessage('SKIP_WAITING');
    setUpdateReady(false);
  }, [waitingWorker]);

  const updateLater = useCallback(() => setUpdateReady(false), []);

  const value = useMemo<PwaContextValue>(
    () => ({
      installed,
      canInstall: !!installEvent,
      isIos,
      dismissed,
      promptInstall,
      dismissInstall,
      updateReady,
      updateNow,
      updateLater,
    }),
    [installed, installEvent, isIos, dismissed, promptInstall, dismissInstall, updateReady, updateNow, updateLater]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error('usePwa must be used within a PwaProvider');
  return ctx;
}
