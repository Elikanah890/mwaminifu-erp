-- Perf & idempotency reconciliation (additive, idempotent).
-- 1) Offline idempotency: unique clientId scoping so replayed writes cannot duplicate.
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "Sale_shopId_clientId_key" ON "Sale"("shopId", "clientId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "Refund_shopId_clientId_key" ON "Refund"("shopId", "clientId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "Expense_shopId_clientId_key" ON "Expense"("shopId", "clientId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "CreditPayment_clientId_key" ON "CreditPayment"("clientId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- 2) Offline stock adjustments become idempotent too.
DO $$ BEGIN
  ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "StockAdjustment_shopId_clientId_key" ON "StockAdjustment"("shopId", "clientId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- 3) Composite indexes for hot list / sync / dashboard queries.
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Sale_shopId_saleDate_idx" ON "Sale"("shopId", "saleDate");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Refund_shopId_createdAt_idx" ON "Refund"("shopId", "createdAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Expense_shopId_createdAt_idx" ON "Expense"("shopId", "createdAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "StockMovement_shopId_createdAt_idx" ON "StockMovement"("shopId", "createdAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ActivityLog_shopId_createdAt_idx" ON "ActivityLog"("shopId", "createdAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "AuditLog_shopId_createdAt_idx" ON "AuditLog"("shopId", "createdAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "SmsLog_shopId_createdAt_idx" ON "SmsLog"("shopId", "createdAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Notification_shopId_createdAt_idx" ON "Notification"("shopId", "createdAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Product_shopId_createdAt_idx" ON "Product"("shopId", "createdAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "CreditPayment_customerId_createdAt_idx" ON "CreditPayment"("customerId", "createdAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- 4) Previously unindexed foreign keys.
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ActivityLog_saleId_idx" ON "ActivityLog"("saleId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Refund_userId_idx" ON "Refund"("userId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "StockMovement_userId_idx" ON "StockMovement"("userId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "CashTransaction_userId_idx" ON "CashTransaction"("userId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Otp_userId_idx" ON "Otp"("userId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Otp_isUsed_idx" ON "Otp"("isUsed");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "StockAdjustment_performedBy_idx" ON "StockAdjustment"("performedBy");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Product_supplierId_idx" ON "Product"("supplierId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Commission_paymentId_idx" ON "Commission"("paymentId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Commission_payoutId_idx" ON "Commission"("payoutId");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;
