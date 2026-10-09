'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/Toast';

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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(role === 'EMPLOYEE');

  const refresh = useCallback(async () => {
    if (role !== 'EMPLOYEE') {
      setLoading(false);
      return;
    }
    const result = await apiClient.loadPermissions();
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

  // Surface a friendly toast whenever the API rejects an action with 403.
  useEffect(() => {
    const onDenied = (event: Event) => {
      const detail = (event as CustomEvent).detail as { message?: string } | undefined;
      toast(detail?.message || 'You do not have permission to perform this action', 'error');
    };
    window.addEventListener('permission:denied', onDenied);
    return () => window.removeEventListener('permission:denied', onDenied);
  }, [toast]);

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
