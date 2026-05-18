-- Phase 2: Menu / Shopping / Inventory.
-- See .kiro/specs/phase-2-menu-shopping-inventory/design.md

-- CreateEnum
CREATE TYPE "ShoppingListStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "InventoryLocation" AS ENUM ('PANTRY', 'FRIDGE', 'FREEZER');
CREATE TYPE "InventoryTxnSource" AS ENUM ('PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'INITIAL');

-- CreateTable: menus
CREATE TABLE "menus" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate"   TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable: menu_recipes
CREATE TABLE "menu_recipes" (
    "id"           TEXT NOT NULL,
    "menuId"       TEXT NOT NULL,
    "recipeId"     TEXT NOT NULL,
    "servings"     INTEGER NOT NULL DEFAULT 1,
    "scheduledFor" TIMESTAMP(3),
    "position"     INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_recipes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "menu_recipes_menuId_idx"   ON "menu_recipes"("menuId");
CREATE INDEX "menu_recipes_recipeId_idx" ON "menu_recipes"("recipeId");

-- CreateTable: shopping_lists
CREATE TABLE "shopping_lists" (
    "id"        TEXT NOT NULL,
    "menuId"    TEXT,
    "status"    "ShoppingListStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt"  TIMESTAMP(3),

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable: shopping_list_items
CREATE TABLE "shopping_list_items" (
    "id"                TEXT NOT NULL,
    "shoppingListId"    TEXT NOT NULL,
    "productId"         TEXT NOT NULL,
    "quantity"          DECIMAL(18,4) NOT NULL,
    "unitId"            TEXT NOT NULL,
    "purchasedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "purchasedAt"       TIMESTAMP(3),
    "note"              TEXT,
    "position"          INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shopping_list_items_shoppingListId_idx" ON "shopping_list_items"("shoppingListId");
CREATE INDEX "shopping_list_items_productId_idx"      ON "shopping_list_items"("productId");

-- CreateTable: inventory_items
CREATE TABLE "inventory_items" (
    "id"        TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity"  DECIMAL(18,4) NOT NULL,
    "unitId"    TEXT NOT NULL,
    "location"  "InventoryLocation" NOT NULL DEFAULT 'PANTRY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_items_productId_location_key" ON "inventory_items"("productId", "location");
CREATE INDEX        "inventory_items_productId_idx"          ON "inventory_items"("productId");

-- CreateTable: inventory_txns
CREATE TABLE "inventory_txns" (
    "id"        TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity"  DECIMAL(18,4) NOT NULL,
    "unitId"    TEXT NOT NULL,
    "source"    "InventoryTxnSource" NOT NULL,
    "refType"   TEXT,
    "refId"     TEXT,
    "note"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_txns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_txns_productId_createdAt_idx" ON "inventory_txns"("productId", "createdAt");

-- ---------- Foreign keys ----------

ALTER TABLE "menu_recipes"
  ADD CONSTRAINT "menu_recipes_menuId_fkey"
  FOREIGN KEY ("menuId") REFERENCES "menus"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "menu_recipes"
  ADD CONSTRAINT "menu_recipes_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "recipes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shopping_lists"
  ADD CONSTRAINT "shopping_lists_menuId_fkey"
  FOREIGN KEY ("menuId") REFERENCES "menus"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_shoppingListId_fkey"
  FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
