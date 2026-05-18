# Дизайн — Фаза 2

## 1. Модули

```
src/
  units/
    units.module.ts
    unit-converter.service.ts        # конвертация qty между unit-ами с учётом UnitConversion
    unit-conversions.ts              # чистые функции (тестируемые без БД)
  menu/
    menu.module.ts
    menu.controller.ts
    menu.service.ts
    dto/
  shopping/
    shopping.module.ts
    shopping.controller.ts
    shopping.service.ts              # generateFromMenu, markPurchased (атомарные tx)
    aggregator.ts                    # чистая функция: рецепты+порции -> агрегат по продуктам
    dto/
  inventory/
    inventory.module.ts
    inventory.controller.ts
    inventory.service.ts             # addStock (used by shopping), list, adjust
    dto/
```

Зависимости:
`Shopping` → `Menu`, `Inventory`, `Units`.
`Inventory` — самостоятельный.
`Units` — общий, экспортирует `UnitConverterService`.

## 2. Модель данных (дополнения)

```prisma
model Menu {
  id        String   @id @default(cuid())
  name      String
  startDate DateTime?
  endDate   DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  recipes       MenuRecipe[]
  shoppingLists ShoppingList[]

  @@map("menus")
}

model MenuRecipe {
  id           String   @id @default(cuid())
  menuId       String
  menu         Menu     @relation(fields: [menuId], references: [id], onDelete: Cascade)
  recipeId     String
  recipe       Recipe   @relation(fields: [recipeId], references: [id])
  servings     Int      @default(1)
  scheduledFor DateTime?
  position     Int      @default(0)

  @@index([menuId])
  @@index([recipeId])
  @@map("menu_recipes")
}

enum ShoppingListStatus { ACTIVE CLOSED }

model ShoppingList {
  id        String   @id @default(cuid())
  menuId    String?
  menu      Menu?    @relation(fields: [menuId], references: [id], onDelete: SetNull)
  status    ShoppingListStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  closedAt  DateTime?

  items ShoppingListItem[]

  @@map("shopping_lists")
}

model ShoppingListItem {
  id                String  @id @default(cuid())
  shoppingListId    String
  shoppingList      ShoppingList @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)
  productId         String
  product           Product @relation(fields: [productId], references: [id])
  quantity          Decimal @db.Decimal(18, 4)
  unitId            String
  unit              Unit    @relation(fields: [unitId], references: [id])
  purchasedQuantity Decimal @default(0) @db.Decimal(18, 4)
  purchasedAt       DateTime?
  note              String?
  position          Int     @default(0)

  @@index([shoppingListId])
  @@index([productId])
  @@map("shopping_list_items")
}

enum InventoryLocation { PANTRY FRIDGE FREEZER }

model InventoryItem {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Decimal  @db.Decimal(18, 4)
  unitId    String                              // == product.baseUnitId (инвариант)
  unit      Unit     @relation(fields: [unitId], references: [id])
  location  InventoryLocation @default(PANTRY)
  updatedAt DateTime @updatedAt

  @@unique([productId, location])
  @@index([productId])
  @@map("inventory_items")
}

enum InventoryTxnSource { PURCHASE CONSUMPTION ADJUSTMENT INITIAL }

model InventoryTxn {
  id         String   @id @default(cuid())
  productId  String
  quantity   Decimal  @db.Decimal(18, 4)        // signed: + add / - remove
  unitId     String
  source     InventoryTxnSource
  refType    String?
  refId      String?
  note       String?
  createdAt  DateTime @default(now())

  @@index([productId, createdAt])
  @@map("inventory_txns")
}
```

К `Recipe`, `Product`, `Unit` — back-references.

## 3. Алгоритм генерации списка покупок

Pure-функция `aggregate` принимает уже подгруженные данные:

```ts
aggregate({
  recipes: { ingredients: { productId, quantity, unitId }[]; servingsScale }[],
  productBaseUnit: Map<productId, baseUnitId>,
  convert: (qty, from, to, productId) => number | null,
}): { items: { productId, quantity, unitId }[]; errors: { productId, fromUnit }[] }
```

Шаги:
1. Для каждой строки: `qty *= servingsScale`.
2. Конвертим `qty` из `unitId` в `baseUnit` продукта. Если `convert` вернул
   `null` — копим в `errors`, не теряем тихо.
3. Группируем по `productId`, суммируем `qty`.

Сервис:
1. Загружает меню + рецепты + ингредиенты.
2. Загружает `UnitConversion` для всех затронутых продуктов + глобальные.
3. Зовёт `aggregate`. Если `errors.length > 0` → `BadRequestException`.
4. Если `subtractInventory` — вычитает текущие `InventoryItem` (по продукту, суммарно по локациям).
5. Создаёт `ShoppingList` + `ShoppingListItem[]` одним `prisma.$transaction`.

## 4. Алгоритм покупки

```ts
markPurchased(itemId, { quantity?, location?, note? }) {
  return prisma.$transaction(async tx => {
    const item = await tx.shoppingListItem.findUniqueOrThrow({
      where: { id: itemId },
      include: { product: { select: { id: true, baseUnitId: true } } },
    });

    const remaining = num(item.quantity) - num(item.purchasedQuantity);
    const purchaseQty = quantity ?? remaining;
    if (purchaseQty <= 0) throw BadRequest('nothing left to purchase');
    if (purchaseQty > remaining + EPS) throw BadRequest('over-purchase');

    const newPurchased = num(item.purchasedQuantity) + purchaseQty;
    const fullyDone = newPurchased >= num(item.quantity) - EPS;

    await tx.shoppingListItem.update({
      where: { id: itemId },
      data: {
        purchasedQuantity: newPurchased,
        purchasedAt: fullyDone ? new Date() : null,
      },
    });

    const baseUnit = item.product.baseUnitId;
    const baseQty = item.unitId === baseUnit
      ? purchaseQty
      : await converter.convert(purchaseQty, item.unitId, baseUnit, item.productId, tx);

    const loc = location ?? 'PANTRY';

    await tx.inventoryItem.upsert({
      where: { productId_location: { productId: item.productId, location: loc } },
      create: { productId: item.productId, quantity: baseQty, unitId: baseUnit, location: loc },
      update: { quantity: { increment: baseQty } },
    });

    await tx.inventoryTxn.create({
      data: {
        productId: item.productId,
        quantity: baseQty,
        unitId: baseUnit,
        source: 'PURCHASE',
        refType: 'ShoppingListItem',
        refId: itemId,
        note,
      },
    });

    return { itemId, baseQty, baseUnit, location: loc, fullyDone };
  });
}
```

Атомарность гарантирует, что баг «купил, но в инвентаре не появилось»
становится невозможным: либо обновились все три записи (item, inventory,
txn), либо ни одна.

## 5. REST контракты

| Method | Path | Body |
| --- | --- | --- |
| POST | `/menus` | `{ name, startDate?, endDate? }` |
| GET | `/menus` | — |
| GET | `/menus/:id` | — |
| PATCH | `/menus/:id` | `{ name?, startDate?, endDate? }` |
| DELETE | `/menus/:id` | — |
| POST | `/menus/:id/recipes` | `{ recipeId, servings, scheduledFor? }` |
| DELETE | `/menus/:id/recipes/:menuRecipeId` | — |
| POST | `/menus/:id/shopping-list` | `{ subtractInventory?: boolean }` |
| GET | `/shopping-lists/:id` | — |
| PATCH | `/shopping-lists/:listId/items/:itemId/purchase` | `{ quantity?, location?, note? }` |
| GET | `/inventory` | query: `productId?`, `location?` |
| POST | `/inventory/adjust` | `{ productId, quantity, location?, note }` |

## 6. Тесты

Чистые функции, без БД:
- `unit-conversions.spec.ts` — выбор продукт-специфичной vs глобальной, `null` для отсутствующего пути, `from === to → identity`.
- `aggregator.spec.ts` — масштабирование по порциям, агрегация двух рецептов с одним продуктом в разных единицах, корректная обработка ошибок.

Покупка → инвентарь — тестируется на реальной БД (вне sandbox), потому что
ключевой инвариант здесь — атомарность Prisma `$transaction`. В Фазе 2
оставляем как DoD-чек на CI/локалке.
