# Tasks — Фаза 4

## T1. Schema + миграция
- В `prisma/schema.prisma`: убрать `@@unique([productId, location])` у `InventoryItem`,
  добавить `expiresAt`, `acquiredAt`, индексы.
- Миграция `20260518230000_expiry_and_batches` — raw SQL.

## T2. Pure planner
- Заменить `src/cooking/cooking-planner.ts` на batch-aware `pickBatches`.
- Переписать `test/cooking-planner.spec.ts` под новый API + добавить
  expiry-кейсы.

## T3. CookingService
- Переключить на `pickBatches`.
- Драинить несколько строк, удалять при quantity ≤ eps.
- Один `InventoryTxn` на продукт (не на batch).

## T4. ShoppingService + InventoryService
- `markPurchased`: `upsert` → `create()` с опциональным `expiresAt`.
- `addStockTx` (InventoryService): `upsert` → `create()`.
- `adjust`: положительный → новая партия; отрицательный → FEFO drain.

## T5. AlertsModule
- `GET /alerts/expiring?days=N`
- `GET /alerts/expiring/count?days=N`
- Подключить в `AppModule`.

## T6. DTO
- `MarkPurchasedDto.expiresAt?: ISO date`
- `AdjustInventoryDto.expiresAt?: ISO date`

## T7. Тесты
- `bun test test/` → все 53 + новые ≥ 8 кейсов pickBatches.

## T8. README + PR
- Обновить таблицу REST.
- Ветка `phase-4/expiry-and-alerts` → `main`.

## DoD
- [ ] Все тесты зелёные.
- [ ] Спека закоммичена.
- [ ] PR открыт.
