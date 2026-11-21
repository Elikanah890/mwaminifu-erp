ALTER TABLE "Employee" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "userId"
    ORDER BY "createdAt" ASC, id ASC
  ) AS rn
  FROM "Employee"
  WHERE "isActive" = true AND "deletedAt" IS NULL
)
UPDATE "Employee" e
SET "isPrimary" = true
FROM ranked r
WHERE e.id = r.id AND r.rn = 1;

CREATE UNIQUE INDEX "Employee_userId_isPrimary_key"
  ON "Employee"("userId") WHERE "isPrimary" = true;

CREATE INDEX "Employee_userId_isPrimary_idx"
  ON "Employee"("userId", "isPrimary");
