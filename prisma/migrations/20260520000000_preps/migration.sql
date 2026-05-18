-- Phase 6.7: Preps (заготовки) — recipes that produce homemade
-- semi-finished products consumed by other recipes via inventory.
-- See .kiro/specs/phase-6.7-preps/design.md

-- 1. Extend RecipeGroup enum (8th value).
ALTER TYPE "RecipeGroup" ADD VALUE 'PREP';

-- 2. New InventoryTxnSource for the produced batch.
ALTER TYPE "InventoryTxnSource" ADD VALUE 'PREP_PRODUCTION';

-- 3. Product.isPrep — true for products that are produced by a PREP recipe.
ALTER TABLE "products"
    ADD COLUMN "isPrep" BOOLEAN NOT NULL DEFAULT false;

-- 4. Recipe — five new optional fields, FKs and an index.
ALTER TABLE "recipes"
    ADD COLUMN "producesProductId"   TEXT,
    ADD COLUMN "prepYieldQuantity"   DECIMAL(18, 4),
    ADD COLUMN "prepYieldUnitId"     TEXT,
    ADD COLUMN "prepDefaultLocation" "InventoryLocation",
    ADD COLUMN "prepShelfLifeDays"   INTEGER;

ALTER TABLE "recipes"
    ADD CONSTRAINT "recipes_producesProductId_fkey"
        FOREIGN KEY ("producesProductId")
        REFERENCES "products"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "recipes"
    ADD CONSTRAINT "recipes_prepYieldUnitId_fkey"
        FOREIGN KEY ("prepYieldUnitId")
        REFERENCES "units"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "recipes_producesProductId_idx" ON "recipes"("producesProductId");
