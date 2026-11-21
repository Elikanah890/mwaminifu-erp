-- Offline idempotency for POS customer/product creation.
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_shopId_clientId_key" ON "Customer"("shopId", "clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_shopId_clientId_key" ON "Product"("shopId", "clientId");
