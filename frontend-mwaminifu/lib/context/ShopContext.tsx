'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { apiClient, setApiActiveShopId } from '@/lib/api/client';
import { kvGet, kvSet } from '@/lib/offline/db';

export type AccessibleShop = {
  id: string;
  name: string;
  ownerId?: string;
  address?: string | null;
  businessCategory?: string | null;
  region?: string | null;
  district?: string | null;
  ward?: string | null;
  street?: string | null;
  currency?: string;
  isArchived?: boolean;
  _count?: { products?: number; sales?: number; employees?: number };
};

type ShopContextValue = {
  shops: AccessibleShop[];
  activeShopId: string | null;
  activeShop: AccessibleShop | null;
  setActiveShopId: (id: string) => void;
  refreshShops: () => Promise<void>;
  loading: boolean;
  error: string;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<AccessibleShop[]>([]);
  const [activeShopId, setActiveShopIdState] = useState<string | null>(null);
  const activeShopIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<AccessibleShop[]>('/shops');
      const list = res.data ?? [];
      const saved = await kvGet<string>('activeShopId');
      const current = activeShopIdRef.current;
      const candidate =
        (current && list.some((s) => s.id === current) ? current : null) ??
        (saved && list.some((s) => s.id === saved) ? saved : null) ??
        list[0]?.id ??
        null;

      activeShopIdRef.current = candidate;
      setApiActiveShopId(candidate);
      setShops(list);
      setActiveShopIdState(candidate);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shop:changed', { detail: { shopId: candidate } }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setActiveShopId = useCallback((id: string) => {
    activeShopIdRef.current = id;
    setApiActiveShopId(id);
    setActiveShopIdState(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shop:changed', { detail: { shopId: id } }));
    }
  }, []);

  const activeShop = shops.find((s) => s.id === activeShopId) ?? shops[0] ?? null;

  useEffect(() => {
    if (activeShop?.id) {
      void kvSet('activeShopId', activeShop.id);
      if (activeShopIdRef.current !== activeShop.id) {
        activeShopIdRef.current = activeShop.id;
        setApiActiveShopId(activeShop.id);
      }
    }
  }, [activeShop?.id]);

  return (
    <ShopContext.Provider
      value={{ shops, activeShopId: activeShop?.id ?? null, activeShop, setActiveShopId, refreshShops: load, loading, error }}
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
