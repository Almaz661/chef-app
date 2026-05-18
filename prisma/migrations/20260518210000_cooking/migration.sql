-- Phase 3: cooking — adds cookedAt to MenuRecipe.
-- See .kiro/specs/phase-3-cooking-and-nutrition/design.md

ALTER TABLE "menu_recipes"
  ADD COLUMN "cookedAt" TIMESTAMP(3);

CREATE INDEX "menu_recipes_cookedAt_idx" ON "menu_recipes"("cookedAt");
