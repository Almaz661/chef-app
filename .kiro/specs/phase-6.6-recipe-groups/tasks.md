# Tasks — Фаза 6.6

## T1. Schema + миграция
- Enum `RecipeGroup` (7 значений).
- `Recipe.group: RecipeGroup?` + индекс.
- Миграция `20260519000000_recipe_groups`.

## T2. Seed-данные
- 5 существующих рецептов получают `group`.
- Добавить 10+ новых рецептов так, чтобы каждая группа имела ≥2 блюда.
- Обновить `prisma/data/recipes.ts` и `seed.ts` (передача `group`).

## T3. API
- `ListRecipesDto` (group + search).
- `RecipesService.list(filter)` — фильтр + поиск.
- `RecipesService.groupCounts()` — фиксированный порядок 7 + UNGROUPED.
- `RecipesController` — `GET /recipes`, `GET /recipes/groups`.
- `CreateRecipeDto.group?` + проброс в `create`/`update`.

## T4. Тесты
- catalog-integrity: «валидная группа», «нет пустых групп».
- Регрессия 85 тестов.

## T5. Спека + README + PR

## DoD
- [ ] Миграция поднимается чисто.
- [ ] 88 тестов зелёные (85 + 3 новых).
- [ ] PR открыт.
