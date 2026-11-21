/**
 * Shared billing-status rules for Business Owners and shops.
 *
 * PENDING_PAYMENT means no completed SubscriptionPayment exists yet. Such a
 * registration must never be reported as Grace/Lapsed.
 */
export const BILLING_GRACE_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type BillingStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'GRACE' | 'LAPSED';

export type BillingSubscription = {
  status?: string | null;
  isActive?: boolean | null;
  endDate?: Date | string | null;
  payments?: Array<{ id?: string }> | null;
};

function paymentCount(sub: BillingSubscription): number {
  return sub.payments?.length ?? 0;
}

function endTime(sub: BillingSubscription): number | null {
  return sub.endDate ? new Date(sub.endDate).getTime() : null;
}

/** Owner-level status across every shop they own. */
export function billingStatusForOwner(
  subscriptions: BillingSubscription[],
  now: Date = new Date()
): BillingStatus {
  if (!subscriptions.some((sub) => paymentCount(sub) > 0)) return 'PENDING_PAYMENT';
  const nowMs = now.getTime();
  const hasActive = subscriptions.some((sub) => {
    if (paymentCount(sub) === 0) return false;
    if ((sub.status ?? '').toUpperCase() !== 'ACTIVE' || sub.isActive === false) return false;
    const end = endTime(sub);
    return end == null || end >= nowMs;
  });
  return hasActive ? 'ACTIVE' : 'LAPSED';
}

/** Shop-level status used by the System Owner health metrics. */
export function billingStatusForShop(
  subscription: BillingSubscription,
  now: Date = new Date()
): BillingStatus {
  if (paymentCount(subscription) === 0) return 'PENDING_PAYMENT';
  if ((subscription.status ?? '').toUpperCase() !== 'ACTIVE' || subscription.isActive === false) {
    return 'LAPSED';
  }
  const end = endTime(subscription);
  if (end == null || end >= now.getTime()) return 'ACTIVE';
  if (now.getTime() <= end + BILLING_GRACE_DAYS * DAY_MS) return 'GRACE';
  return 'LAPSED';
}
