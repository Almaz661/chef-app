-- Phase 6.6: recipe groups for menu navigation.
-- See .kiro/specs/phase-6.6-recipe-groups/design.md

CREATE TYPE "RecipeGroup" AS ENUM (
    'BREAKFAST',
    'SOUP',
    'MAIN',
    'SALAD',
    'BAKING',
    'DESSERT',
    'DRINK'
);

ALTER TABLE "recipes"
    ADD COLUMN "group" "RecipeGroup";

CREATE INDEX "recipes_group_idx" ON "recipes"("group");
