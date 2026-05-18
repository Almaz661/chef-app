# Tasks — Фаза 6.7: Заготовки

## T1. Schema + миграция
- enum `RecipeGroup` += `PREP`.
- enum `InventoryTxnSource` += `PREP_PRODUCTION`.
- `Product.isPrep Boolean @default(false)`.
- `Recipe`: 5 новых nullable полей + связи + `@@index([producesProductId])`.
- Файл `prisma/migrations/20260520000000_preps/migration.sql`.

## T2. Pure helper + unit-tests
- `src/cooking/prep-yield.ts` — `computePrepYield`.
- `test/prep-yield.spec.ts` — 6+ кейсов (scale, expiresAt, location, ошибки).

## T3. CookingService
- Расширить `cook()` PREP-веткой в той же транзакции.
- Тип ответа: добавить опциональное `produced`.
- `BadRequest`, если поля PREP частично заполнены.
- Регрессия: для не-PREP рецептов ответ не меняется.

## T4. DTO / валидация
- `CreateRecipeDto` / `UpdateRecipeDto`: добавить 5 полей + `RecipeGroupDto.PREP`.
- Service-level проверка «все 5 или ничего».

## T5. Seed
- `prisma/data/products-prep.ts` — 10 продуктов с `isPrep: true`.
- `prisma/data/recipes-prep.ts` — 10 рецептов, `group: 'PREP'` + связи.
- `seed.ts` — резолв `producesProductSlug → productId`, проброс PREP-полей.
- Сроки годности по таблице из `requirements.md`.

## T6. Тесты
- расширение `test/catalog-integrity.spec.ts`:
  - все PREP-продукты в категории «Заготовки», `isPrep = true`;
  - каждый PREP-рецепт ссылается на существующий PREP-продукт;
  - все 5 PREP-полей рецепта заполнены;
  - группа `PREP` присутствует.
- Регрессия 88+ тестов.

## T7. Спека + PR
- Спека уже есть (`requirements.md`, `design.md`, `tasks.md`).
- README не трогаем (фаза 1–6.6 описывала концепции).
- PR #9 от `phase-6.7/preps` → `main`.

## DoD
- [ ] `prisma generate` без ошибок, миграция применима.
- [ ] `bun test test/` — 88 + 7 (`prep-yield`) + ~4 (расширение catalog-integrity) ≥ 99 тестов зелёные.
- [ ] PR #9 открыт, описание заполнено.
