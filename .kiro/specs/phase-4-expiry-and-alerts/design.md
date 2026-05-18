# Дизайн — Фаза 4

## 1. Изменения схемы

```prisma
model InventoryItem {
  id          String            @id @default(cuid())
  productId   String
  product     Product           @relation(fields: [productId], references: [id])
  quantity    Decimal           @db.Decimal(18, 4)
  unitId      String
  unit        Unit              @relation(fields: [unitId], references: [id])
  location    InventoryLocation @default(PANTRY)
  expiresAt   DateTime?         // NEW
  acquiredAt  DateTime          @default(now())   // NEW
  updatedAt   DateTime          @updatedAt

  // Unique (productId, location) DROPPED — multiple batches per slot allowed.
  @@index([productId])
  @@index([productId, location])
  @@index([expiresAt])
  @@map("inventory_items")
}
```

Миграция `20260518230000_expiry_and_batches` (raw SQL):

```sql
DROP INDEX "inventory_items_productId_location_key";

ALTER TABLE "inventory_items" ADD COLUMN "expiresAt"  TIMESTAMP(3);
ALTER TABLE "inventory_items" ADD COLUMN "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "inventory_items_productId_location_idx" ON "inventory_items"("productId", "location");
CREATE INDEX "inventory_items_expiresAt_idx"          ON "inventory_items"("expiresAt");
```

## 2. Новая чистая функция `pickBatches`

```ts
type Loc = 'PANTRY' | 'FRIDGE' | 'FREEZER';

interface Batch {
  id: string;
  productId: string;
  location: Loc;
  quantity: number;          // base unit
  expiresAt: Date | null;
  acquiredAt: Date;
}

interface Need { productId: string; quantity: number; baseUnitId: string }

interface PickInput {
  needs: readonly Need[];
  batches: ReadonlyMap<string, readonly Batch[]>;   // by productId
  preferLocation?: Loc;
  fallbackOrder?: readonly Loc[];                   // default ['PANTRY','FRIDGE','FREEZER']
  now: Date;                                        // for testability
}

interface PickLine {
  productId: string;
  baseUnitId: string;
  quantity: number;                                 // sum of takes
  takes: { batchId: string; location: Loc; quantity: number; expired: boolean }[];
}

interface PickResult {
  ok: boolean;
  lines: PickLine[];
  shortages: { productId: string; need: number; have: number }[];
}
```

Алгоритм для каждого `need`:
1. Сгруппировать партии продукта по `location`.
2. Построить порядок локаций: `preferLocation → fallbackOrder`.
3. В каждой локации отсортировать партии: `expired_first asc, expiresAt asc nulls_last, acquiredAt asc`.
4. Идти по локациям/партиям, забирать `min(remaining, batch.quantity)`.
5. Если `remaining > eps` после всех локаций — добавить в `shortages`.

`shortages.length > 0` → `ok=false, lines=[]` (all-or-nothing, как в Фазе 3).

## 3. Замена в сервисах

### `ShoppingService.markPurchased`

Было:
```ts
await tx.inventoryItem.upsert({
  where: { productId_location: { productId, location } },
  create: { ..., quantity: baseQty },
  update: { quantity: { increment: baseQty } },
});
```

Стало:
```ts
await tx.inventoryItem.create({
  data: { productId, quantity: baseQty, unitId, location, expiresAt },
});
```

`addStockTx` в `InventoryService` тоже становится `create()`.

### `CookingService.cook`

Было: `planConsumption` (location-only), потом одиночный `update(decrement)`.

Стало:
1. Загружаем все партии по `productIds` через `findMany`.
2. Зовём `pickBatches(needs, batches, preferLocation, now)`.
3. Для каждой `take`: либо `update(quantity: { decrement })`, либо
   `delete(id)` если новая `quantity <= eps`.
4. Пишем `InventoryTxn(CONSUMPTION, refType=MenuRecipe, refId)` —
   агрегированно по продукту, не по партии (детализация партий
   избыточна для аудита).

### `InventoryService.adjust`

```ts
adjust({ productId, quantity, location?, note, expiresAt? }) {
  if (quantity > 0) {
    // create new batch
    tx.inventoryItem.create({ data: { productId, quantity, unitId: baseUnit, location, expiresAt } });
    tx.inventoryTxn.create({ source: ADJUSTMENT, ... });
  } else {
    // FEFO drain via pickBatches with single need; same delete-on-zero logic
  }
}
```

## 4. Новый модуль `alerts`

```
src/alerts/
  alerts.module.ts
  alerts.controller.ts
  alerts.service.ts
  dto/expiring-query.dto.ts
```

```ts
GET /alerts/expiring?days=N        // default 3
GET /alerts/expiring/count?days=N
```

Сервис делает один SELECT с фильтром
`expiresAt IS NOT NULL AND expiresAt <= now + N days`,
помечает каждую запись `status: 'EXPIRED' | 'SOON'`.

## 5. Тесты

`test/cooking-planner.spec.ts` переписывается под новую функцию `pickBatches`:
- единственная партия — берётся целиком,
- две партии в одной локации — FEFO выбирает с ближним сроком,
- партия без `expiresAt` уходит ПОСЛЕ партии со сроком,
- просроченная партия (`expiresAt < now`) идёт самой первой,
- preferLocation работает,
- shortage → `ok=false`, `lines=[]`,
- две партии с одинаковым `expiresAt` — tiebreak по `acquiredAt`,
- многоингредиентный список + детерминированный порядок.

Все остальные тесты (`parser`, `unit-conversions`, `aggregator`, `nutrition`)
работают без изменений.

## 6. REST контракты Phase 4

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `/alerts/expiring` | `?days=N` | `Array<{ id, productId, productName, location, quantity, baseUnitId, expiresAt, status: 'EXPIRED' \| 'SOON' }>` |
| GET | `/alerts/expiring/count` | `?days=N` | `{ expired: number, soon: number }` |
| PATCH | `/shopping-lists/:listId/items/:itemId/purchase` | `{ ..., expiresAt? }` | существующий + поле `expiresAt` в созданной партии |
| POST | `/inventory/adjust` | `{ ..., expiresAt? }` | для положительных корректировок |
