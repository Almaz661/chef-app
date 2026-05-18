-- Initial migration for ShefDom Phase 1.
-- See .kiro/specs/phase-1-product-master/design.md

-- Required PostgreSQL extension for fuzzy matching (trigram similarity).
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('MASS', 'VOLUME', 'COUNT', 'OTHER');

-- CreateTable
CREATE TABLE "units" (
    "id"   TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "UnitKind" NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id"            TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "category"      TEXT,
    "baseUnitId"    TEXT NOT NULL,
    "kcalPer100"    DOUBLE PRECISION,
    "proteinPer100" DOUBLE PRECISION,
    "fatPer100"     DOUBLE PRECISION,
    "carbsPer100"   DOUBLE PRECISION,
    "tags"          TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateTable
CREATE TABLE "product_aliases" (
    "id"             TEXT NOT NULL,
    "productId"      TEXT NOT NULL,
    "text"           TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "locale"         TEXT NOT NULL DEFAULT 'ru',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_aliases_normalizedText_locale_key"
  ON "product_aliases"("normalizedText", "locale");
CREATE INDEX "product_aliases_productId_idx" ON "product_aliases"("productId");

-- Trigram GIN index on normalized alias text — backs fuzzy matching.
CREATE INDEX "product_aliases_normalizedText_trgm_idx"
  ON "product_aliases" USING GIN ("normalizedText" gin_trgm_ops);

-- CreateTable
CREATE TABLE "unit_conversions" (
    "id"         TEXT NOT NULL,
    "productId"  TEXT,
    "fromUnitId" TEXT NOT NULL,
    "toUnitId"   TEXT NOT NULL,
    "factor"     DECIMAL(18,6) NOT NULL,

    CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unit_conversions_productId_fromUnitId_toUnitId_key"
  ON "unit_conversions"("productId", "fromUnitId", "toUnitId");

-- CreateTable
CREATE TABLE "recipes" (
    "id"          TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "servings"    INTEGER NOT NULL DEFAULT 1,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id"        TEXT NOT NULL,
    "recipeId"  TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity"  DECIMAL(18,4) NOT NULL,
    "unitId"    TEXT NOT NULL,
    "rawText"   TEXT,
    "note"      TEXT,
    "position"  INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");
CREATE INDEX "recipe_ingredients_productId_idx" ON "recipe_ingredients"("productId");

-- CreateTable
CREATE TABLE "ingredient_match_queue" (
    "id"         TEXT NOT NULL,
    "recipeId"   TEXT,
    "rawText"    TEXT NOT NULL,
    "parsedName" TEXT NOT NULL,
    "quantity"   DECIMAL(18,4),
    "unitId"     TEXT,
    "reason"     TEXT NOT NULL,
    "candidates" JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_match_queue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ingredient_match_queue_recipeId_idx" ON "ingredient_match_queue"("recipeId");
CREATE INDEX "ingredient_match_queue_reason_idx" ON "ingredient_match_queue"("reason");

-- ---------- Foreign keys ----------

ALTER TABLE "products"
  ADD CONSTRAINT "products_baseUnitId_fkey"
  FOREIGN KEY ("baseUnitId") REFERENCES "units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_aliases"
  ADD CONSTRAINT "product_aliases_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unit_conversions"
  ADD CONSTRAINT "unit_conversions_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "unit_conversions"
  ADD CONSTRAINT "unit_conversions_fromUnitId_fkey"
  FOREIGN KEY ("fromUnitId") REFERENCES "units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "unit_conversions"
  ADD CONSTRAINT "unit_conversions_toUnitId_fkey"
  FOREIGN KEY ("toUnitId") REFERENCES "units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "recipes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ingredient_match_queue"
  ADD CONSTRAINT "ingredient_match_queue_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "recipes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ingredient_match_queue"
  ADD CONSTRAINT "ingredient_match_queue_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
