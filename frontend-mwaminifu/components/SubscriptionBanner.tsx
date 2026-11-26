'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useOptionalShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';

type StatusPayload = {
  state?: 'ACTIVE' | 'GRACE' | 'LAPSED' | 'NONE';
  effectiveStatus?: string;
  daysUntilExpiry?: number | null;
} | null;

/**
 * Shows a warning banner when the active shop's subscription has lapsed.
 * Read-only mode (writes return 402) is enforced by the backend; this is the
 * client-facing notice.
 */
export default function SubscriptionBanner() {
  const { t } = useI18n();
  const shop = useOptionalShop();
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    setIsOwner(apiClient.getUser()?.role === 'BUSINESS_OWNER');
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setDismissed(false);
      void detail;
      setMessageKey('subscriptionExpired');
    };
    window.addEventListener('subscription:expired', handler as EventListener);
    return () => window.removeEventListener('subscription:expired', handler as EventListener);
  }, []);

  useEffect(() => {
    const shopId = shop?.activeShopId;
    if (!shopId) return;
    let cancelled = false;
    apiClient
      .get<StatusPayload>(`/subscriptions/status?shopId=${shopId}`)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.state === 'LAPSED') setMessageKey('subscriptionExpired');
        else if (res.data?.state === 'GRACE') setMessageKey('subscriptionGrace');
      })
      .catch(() => {
        // Status is best-effort; the backend remains the source of truth.
      });
    return () => {
      cancelled = true;
    };
  }, [shop?.activeShopId]);

  if (!messageKey || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-danger/25 bg-danger/10 px-4 py-2 text-sm text-danger">
      <span>{t(messageKey)}</span>
      <div className="flex shrink-0 items-center gap-3">
        {isOwner && (
          <Link href="/owner/settings" className="font-semibold underline">
            {t('renew')}
          </Link>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t('dismissSubscriptionNotice')}
          className="text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
