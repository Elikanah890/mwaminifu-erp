'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { SubscriptionPlan } from '@/lib/types';

export function usePublicPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<SubscriptionPlan[]>('/plans')
      .then((res) => {
        if (!cancelled) setPlans(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('unavailable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plans, loading, error };
}
