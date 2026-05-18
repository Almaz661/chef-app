# Tasks — Фаза 2

## T1. Schema + миграция
- Расширить `prisma/schema.prisma`: `Menu`, `MenuRecipe`, `ShoppingList`,
  `ShoppingListItem`, `InventoryItem`, `InventoryTxn`, 3 новых enum-а.
- Back-references на `Recipe`, `Product`, `Unit`.
- Новая миграция `20260518180000_menu_shopping_inventory`.

## T2. Units module
- `unit-conversions.ts` — pure-функция выбора правила: продукт-специфика → глобальное → `null`.
- `UnitConverterService` — обёртка с обращением к Prisma (поддерживает `tx`).
- `UnitsModule` экспортирует `UnitConverterService`.
- Тест: `test/unit-conversions.spec.ts`.

## T3. Inventory module
- `InventoryService.list({ productId?, location? })`.
- `InventoryService.addStock(tx, { productId, baseUnitId, qty, location, source, refId, note })`.
  Используется и из `ShoppingService` (через ту же транзакцию).
- `InventoryService.adjust({ productId, quantity, location?, note })`.
- Контроллер: `GET /inventory`, `POST /inventory/adjust`.

## T4. Menu module
- CRUD `Menu`.
- `POST /menus/:id/recipes` — добавить рецепт в меню.
- `DELETE /menus/:id/recipes/:menuRecipeId`.

## T5. Shopping module
- `aggregator.ts` — pure-функция; тест: `test/aggregator.spec.ts`.
- `ShoppingService.generateFromMenu(menuId, { subtractInventory })` —
  собирает данные, зовёт `aggregate`, вычитает инвентарь, создаёт `ShoppingList` в одной tx.
- `ShoppingService.markPurchased(itemId, dto)` — атомарная транзакция,
  обновляет item, апсертит `InventoryItem`, пишет `InventoryTxn`.
- Контроллер: `GET /shopping-lists/:id`, `PATCH /shopping-lists/:listId/items/:itemId/purchase`.

## T6. AppModule wiring
- Зарегистрировать `UnitsModule`, `MenuModule`, `ShoppingModule`, `InventoryModule`.

## T7. PR
- Ветка `phase-2/menu-shopping-inventory` → `main`.
- В описании PR: явно отмечено, что frontend в этом репозитории отсутствует
  и не правится.

## DoD
- [ ] Все pure-функции покрыты тестами и зелёные.
- [ ] Спека закоммичена.
- [ ] Миграция применяется чисто (не валидируется в sandbox; smoke-test локально).
- [ ] PR открыт, ссылка на этот tasks.md в описании.
