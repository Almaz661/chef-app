-- Phase 6: dietary substitutions registry.
-- See .kiro/specs/phase-6-dietary-substitutions/design.md

CREATE TABLE "product_substitutions" (
    "id"              TEXT NOT NULL,
    "productId"       TEXT NOT NULL,
    "substituteId"    TEXT NOT NULL,
    "conversionRatio" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "bidirectional"   BOOLEAN NOT NULL DEFAULT true,
    "note"            TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_substitutions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_substitutions_productId_substituteId_key"
    ON "product_substitutions"("productId", "substituteId");

CREATE INDEX "product_substitutions_productId_idx"    ON "product_substitutions"("productId");
CREATE INDEX "product_substitutions_substituteId_idx" ON "product_substitutions"("substituteId");

-- Sanity check: a product can't be marked as a substitute for itself.
ALTER TABLE "product_substitutions"
    ADD CONSTRAINT "product_substitutions_no_self_check"
    CHECK ("productId" <> "substituteId");

-- Foreign keys: cascade so deleting a product cleans up its substitutions.
ALTER TABLE "product_substitutions"
    ADD CONSTRAINT "product_substitutions_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_substitutions"
    ADD CONSTRAINT "product_substitutions_substituteId_fkey"
    FOREIGN KEY ("substituteId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
