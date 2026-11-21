ALTER TABLE "Product"
  ALTER COLUMN "reorderLevel" TYPE DOUBLE PRECISION USING "reorderLevel"::double precision;
