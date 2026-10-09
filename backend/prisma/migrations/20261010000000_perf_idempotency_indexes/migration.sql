-- Perf & idempotency reconciliation (additive, idempotent).
-- 1) Offline idempotency: unique clientId scoping so replayed writes cannot duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_shopId_clientId_key" ON "Sale"("shopId", "clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "Refund_shopId_clientId_key" ON "Refund"("shopId", "clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "Expense_shopId_clientId_key" ON "Expense"("shopId", "clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "CreditPayment_clientId_key" ON "CreditPayment"("clientId");

-- 2) Offline stock adjustments become idempotent too.
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "StockAdjustment_shopId_clientId_key" ON "StockAdjustment"("shopId", "clientId");

-- 3) Composite indexes for hot list / sync / dashboard queries.
CREATE INDEX IF NOT EXISTS "Sale_shopId_saleDate_idx" ON "Sale"("shopId", "saleDate");
CREATE INDEX IF NOT EXISTS "Refund_shopId_createdAt_idx" ON "Refund"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "Expense_shopId_createdAt_idx" ON "Expense"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "StockMovement_shopId_createdAt_idx" ON "StockMovement"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_shopId_createdAt_idx" ON "ActivityLog"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_shopId_createdAt_idx" ON "AuditLog"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "SmsLog_shopId_createdAt_idx" ON "SmsLog"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_shopId_createdAt_idx" ON "Notification"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "Product_shopId_createdAt_idx" ON "Product"("shopId", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditPayment_customerId_createdAt_idx" ON "CreditPayment"("customerId", "createdAt");

-- 4) Previously unindexed foreign keys.
CREATE INDEX IF NOT EXISTS "ActivityLog_saleId_idx" ON "ActivityLog"("saleId");
CREATE INDEX IF NOT EXISTS "Refund_userId_idx" ON "Refund"("userId");
CREATE INDEX IF NOT EXISTS "StockMovement_userId_idx" ON "StockMovement"("userId");
CREATE INDEX IF NOT EXISTS "CashTransaction_userId_idx" ON "CashTransaction"("userId");
CREATE INDEX IF NOT EXISTS "Otp_userId_idx" ON "Otp"("userId");
CREATE INDEX IF NOT EXISTS "Otp_isUsed_idx" ON "Otp"("isUsed");
CREATE INDEX IF NOT EXISTS "StockAdjustment_performedBy_idx" ON "StockAdjustment"("performedBy");
CREATE INDEX IF NOT EXISTS "Product_supplierId_idx" ON "Product"("supplierId");
CREATE INDEX IF NOT EXISTS "Commission_paymentId_idx" ON "Commission"("paymentId");
CREATE INDEX IF NOT EXISTS "Commission_payoutId_idx" ON "Commission"("payoutId");
CREATE INDEX IF NOT EXISTS "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
