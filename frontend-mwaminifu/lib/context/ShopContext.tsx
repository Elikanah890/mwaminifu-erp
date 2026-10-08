'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { kvSet } from '@/lib/offline/db';

export type AccessibleShop = {
  id: string;
  name: string;
  ownerId?: string;
  address?: string | null;
  currency?: string;
  isArchived?: boolean;
  _count?: { products?: number; sales?: number; employees?: number };
};

type ShopContextValue = {
  shops: AccessibleShop[];
  activeShopId: string | null;
  activeShop: AccessibleShop | null;
  setActiveShopId: (id: string) => void;
  loading: boolean;
  error: string;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<AccessibleShop[]>([]);
  const [activeShopId, setActiveShopIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get<AccessibleShop[]>('/shops');
        const list = res.data ?? [];
        if (cancelled) return;
        setShops(list);
        setActiveShopIdState((current) => current ?? list[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load shops');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveShopId = useCallback((id: string) => {
    setActiveShopIdState(id);
  }, []);

  const activeShop = shops.find((s) => s.id === activeShopId) ?? shops[0] ?? null;

  useEffect(() => {
    if (activeShop?.id) void kvSet('activeShopId', activeShop.id);
  }, [activeShop?.id]);

  return (
    <ShopContext.Provider
      value={{ shops, activeShopId: activeShop?.id ?? null, activeShop, setActiveShopId, loading, error }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within a ShopProvider');
  return ctx;
}

export function useOptionalShop(): ShopContextValue | null {
  return useContext(ShopContext);
}
