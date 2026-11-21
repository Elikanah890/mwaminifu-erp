ALTER TABLE "Product"
  ALTER COLUMN "stockQuantity" TYPE DOUBLE PRECISION USING "stockQuantity"::double precision,
  ALTER COLUMN "baseUnitStock" TYPE DOUBLE PRECISION USING "baseUnitStock"::double precision;

ALTER TABLE "StockAdjustment"
  ALTER COLUMN "quantityChange" TYPE DOUBLE PRECISION USING "quantityChange"::double precision;
