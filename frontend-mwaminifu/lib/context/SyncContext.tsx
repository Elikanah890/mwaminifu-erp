'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSyncEngine, type SyncSnapshot } from '@/lib/offline/sync-engine';

const DEFAULT: SyncSnapshot = {
  status: 'online',
  pending: 0,
  failed: 0,
  syncing: 0,
  lastSyncAt: null,
  lastError: null,
  conflicts: [],
};

const SyncContext = createContext<SyncSnapshot>(DEFAULT);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(DEFAULT);

  useEffect(() => {
    const engine = getSyncEngine();
    engine.start();
    const unsubscribe = engine.subscribe(setSnapshot);
    return () => unsubscribe();
  }, []);

  return <SyncContext.Provider value={snapshot}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncSnapshot {
  return useContext(SyncContext);
}
