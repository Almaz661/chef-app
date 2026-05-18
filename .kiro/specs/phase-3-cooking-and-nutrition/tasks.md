# Tasks — Фаза 3

## T1. Schema + миграция
- В `prisma/schema.prisma`: добавить `cookedAt DateTime?` в `MenuRecipe` + индекс.
- Миграция `20260518210000_cooking` — raw SQL `ALTER TABLE` + `CREATE INDEX`.

## T2. Cooking module
- `cooking-planner.ts` — pure `planConsumption(input): PlanResult`.
- `CookingService.cook(menuRecipeId, dto)` — атомарная tx-логика по дизайну.
- `CookingController.cook` → `POST /menu-recipes/:id/cook`.
- DTO `CookDto { preferLocation? }`.

## T3. Nutrition module
- `nutrition-calc.ts` — pure `computeNutritionForRecipe(args): ComputeResult`.
- `NutritionService.forRecipe`, `NutritionService.forMenu`.
- `NutritionController` — `GET /recipes/:id/nutrition`, `GET /menus/:id/nutrition`.

## T4. AppModule wiring
- Зарегистрировать `CookingModule`, `NutritionModule`.

## T5. Тесты
- `test/cooking-planner.spec.ts`
- `test/nutrition.spec.ts`
- Запустить `bun test test/`, цель — 100% pass.

## T6. Документация и PR
- Обновить README (новые endpoints).
- Ветка `phase-3/cooking-and-nutrition` → `main`.
- В PR явно перечислить out-of-scope и DoD-чеклист.

## DoD
- [ ] Все pure-функции покрыты тестами и зелёные.
- [ ] Спека закоммичена.
- [ ] PR открыт.
