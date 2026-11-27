'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/Toast';
import { useI18n } from '@/lib/context/I18nContext';

type PermissionsValue = {
  permissions: string[];
  loading: boolean;
  can: (permission: string) => boolean;
  refresh: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsValue>({
  permissions: [],
  loading: false,
  can: () => true,
  refresh: async () => {},
});

export function usePermissions(): PermissionsValue {
  return useContext(PermissionsContext);
}

export function PermissionsProvider({ role, children }: { role: string; children: ReactNode }) {
  const { toast } = useToast();
  const { locale } = useI18n();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(role === 'EMPLOYEE');
  const requestSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (role !== 'EMPLOYEE') {
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    const result = await apiClient.loadPermissions();
    // Ignore a slower response for a shop the user has already switched away from.
    if (seq !== requestSeq.current) return;
    setPermissions(result.permissions);
    setLoading(false);
  }, [role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-check permissions whenever the tab regains focus so owner changes apply.
  useEffect(() => {
    if (role !== 'EMPLOYEE') return;
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [role, refresh]);

  // Poll periodically so an owner's grant/revocation reaches an already-open
  // employee session without requiring a re-login.
  useEffect(() => {
    if (role !== 'EMPLOYEE') return;
    const id = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(id);
  }, [role, refresh]);

  // Employee permissions are per shop. Reload them immediately after a switch.
  useEffect(() => {
    if (role !== 'EMPLOYEE') return;
    const onShopChanged = () => void refresh();
    window.addEventListener('shop:changed', onShopChanged);
    return () => window.removeEventListener('shop:changed', onShopChanged);
  }, [role, refresh]);

  // Surface a friendly toast whenever the API rejects an action with 403.
  useEffect(() => {
    const onDenied = () => {
      toast(
        locale === 'sw'
          ? 'Huna ruhusa ya kufanya hivi.'
          : 'You do not have permission for this action.',
        'error'
      );
    };
    window.addEventListener('permission:denied', onDenied);
    return () => window.removeEventListener('permission:denied', onDenied);
  }, [toast, locale]);

  const can = useCallback(
    (permission: string) => (role !== 'EMPLOYEE' ? true : permissions.includes(permission)),
    [role, permissions]
  );

  return (
    <PermissionsContext.Provider value={{ permissions, loading, can, refresh }}>
      {children}
    </PermissionsContext.Provider>
  );
}
