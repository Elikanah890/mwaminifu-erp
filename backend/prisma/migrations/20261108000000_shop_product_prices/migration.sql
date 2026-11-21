CREATE TABLE "ShopProductPrice" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "unitKey" TEXT NOT NULL DEFAULT 'base',
  "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "minPrice" DOUBLE PRECISION,
  "maxPrice" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopProductPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopProductPrice_shopId_productId_unitKey_key"
  ON "ShopProductPrice"("shopId", "productId", "unitKey");
CREATE INDEX "ShopProductPrice_shopId_idx" ON "ShopProductPrice"("shopId");
CREATE INDEX "ShopProductPrice_productId_idx" ON "ShopProductPrice"("productId");

ALTER TABLE "ShopProductPrice"
  ADD CONSTRAINT "ShopProductPrice_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopProductPrice"
  ADD CONSTRAINT "ShopProductPrice_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill shop-specific base prices from the existing shop-owned product.
INSERT INTO "ShopProductPrice" ("id", "shopId", "productId", "unitKey", "sellingPrice", "minPrice", "maxPrice", "createdAt", "updatedAt")
SELECT
  'spp_' || replace(gen_random_uuid()::text, '-', ''),
  p."shopId", p."id", 'base', p."sellingPrice", p."minPrice", p."maxPrice", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" p
ON CONFLICT ("shopId", "productId", "unitKey") DO NOTHING;

-- Backfill unit-configuration prices for the same shop.
INSERT INTO "ShopProductPrice" ("id", "shopId", "productId", "unitKey", "sellingPrice", "minPrice", "maxPrice", "createdAt", "updatedAt")
SELECT
  'spp_' || replace(gen_random_uuid()::text, '-', ''),
  p."shopId", p."id", c."id", c."sellingPrice", c."minPrice", c."maxPrice", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "ProductUnitConfig" c
JOIN "Product" p ON p."id" = c."productId"
ON CONFLICT ("shopId", "productId", "unitKey") DO NOTHING;
