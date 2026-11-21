-- Restore subscription plans that are still referenced by active subscriptions.
-- Deleting a plan in use used to orphan active subscriptions and break revenue
-- reporting. Plan deletion now refuses while active subscriptions exist.
UPDATE "SubscriptionPlan" p
SET "deletedAt" = NULL,
    "isActive" = true,
    "name" = regexp_replace(p."name", '\s*\(deleted [0-9]+\)$', '')
WHERE p."deletedAt" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "Subscription" s
    WHERE s."planId" = p.id AND s."status" = 'ACTIVE'
  );
