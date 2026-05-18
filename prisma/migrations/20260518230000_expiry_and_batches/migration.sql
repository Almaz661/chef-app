-- Phase 4: per-batch inventory with expiry dates.
-- See .kiro/specs/phase-4-expiry-and-alerts/design.md

-- 1) drop the (productId, location) uniqueness so multiple batches can coexist
DROP INDEX "inventory_items_productId_location_key";

-- 2) add new columns
ALTER TABLE "inventory_items"
  ADD COLUMN "expiresAt"  TIMESTAMP(3),
  ADD COLUMN "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3) supporting indexes
CREATE INDEX "inventory_items_productId_location_idx"
  ON "inventory_items"("productId", "location");

CREATE INDEX "inventory_items_expiresAt_idx"
  ON "inventory_items"("expiresAt");
