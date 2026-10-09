'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';

export type AppConfig = {
  appName: string;
  currency: string;
  supportEmail: string;
  supportPhone: string;
};

const DEFAULT: AppConfig = {
  appName: 'Mwaminifu',
  currency: 'TZS',
  supportEmail: '',
  supportPhone: '',
};

const AppConfigContext = createContext<AppConfig>(DEFAULT);

/**
 * Loads the public platform config (`/config`) so the System Owner's "App Name"
 * setting is reflected across the UI (brand, document title). Re-fetches when
 * the `appconfig:refresh` event is dispatched (i.e. after saving settings).
 */
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<Partial<AppConfig>>('/config');
      if (!res.data) return;
      const next: AppConfig = { ...DEFAULT, ...res.data };
      if (next.appName) next.appName = next.appName.trim();
      setConfig(next);
      if (typeof document !== 'undefined' && next.appName) {
        document.title = next.appName;
      }
    } catch {
      /* config is best-effort */
    }
  }, []);

  useEffect(() => {
    void load();
    const onRefresh = () => void load();
    if (typeof window !== 'undefined') window.addEventListener('appconfig:refresh', onRefresh);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('appconfig:refresh', onRefresh);
    };
  }, [load]);

  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfig {
  return useContext(AppConfigContext);
}
