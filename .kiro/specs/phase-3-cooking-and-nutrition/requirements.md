# Фаза 3 — Приготовление и КБЖУ

## 1. Цель

Замкнуть круговорот инвентаря и дать пищевую ценность блюд:

- **Cooking.** Когда пользователь нажимает «приготовлено» на позиции
  меню — ингредиенты списываются из инвентаря. Это обратный поток к
  Фазе 2 (там было «купил → попало в инвентарь»).
- **Nutrition (КБЖУ).** На основе `Product.kcalPer100 / proteinPer100 /
  fatPer100 / carbsPer100` рассчитываем калории/Б/Ж/У для рецепта
  (на порцию и на всю партию) и для меню в целом.

## 2. Глоссарий

| Термин | Значение |
| --- | --- |
| Cook | Действие «приготовил». Списывает запасы согласно ингредиентам рецепта × `MenuRecipe.servings`. |
| ConsumePlan | План списания: на каждый продукт — нужное количество в base unit и из каких `InventoryItem` (по локациям) брать. |
| Nutrition | `{ kcal, protein, fat, carbs }` — все значения в граммах, кроме `kcal`. |
| Per-100 | `Product.*Per100` — нутриенты на 100 «единиц base unit» (грамм для MASS, миллилитров для VOLUME). |

## 3. Функциональные требования

### Cooking

- **FR-3.1** Эндпоинт `POST /menu-recipes/:menuRecipeId/cook`:
  - Берёт `MenuRecipe → Recipe → ingredients[]`.
  - Масштабирует количества по `menuRecipe.servings / recipe.servings`.
  - Конвертирует к `Product.baseUnit` (через `UnitConverterService`).
  - Списывает из `InventoryItem` по продукту: сначала из локации,
    переданной в `preferLocation`, потом по умолчанию `PANTRY → FRIDGE → FREEZER`.
  - Если запасов **не хватает** — операция целиком откатывается,
    клиент получает 422 со списком дефицитов (`{ productId, need, have }[]`).
  - При успехе — пишет `InventoryTxn(source=CONSUMPTION, refType=MenuRecipe, refId=menuRecipeId)` для каждого продукта.
  - На `MenuRecipe` ставит `cookedAt = now()`. Повторный вызов с уже
    приготовленным рецептом → 409.
- **FR-3.2** Все мутации — в одной `prisma.$transaction`. Никаких
  частичных списаний.
- **FR-3.3** Идемпотентность: повторный `cook` на уже приготовленный
  `MenuRecipe` не списывает второй раз.
- **FR-3.4** В ответе сервис возвращает: `consumed: { productId, quantity, baseUnitId, fromLocations: [{ location, qty }] }[]`.

### Nutrition

- **FR-3.5** Чистая функция `computeNutritionForRecipe`:
  - Для каждого ингредиента: конвертим `quantity` к `baseUnit` продукта,
    умножаем на `Per100/100`, накапливаем.
  - Если у продукта нет КБЖУ — пропускаем поле, но помечаем
    `incomplete: true`.
  - Если для ингредиента нет конверсии в base unit — функция возвращает
    `error: { productId, fromUnitId, baseUnitId }` и **не молча обнуляет**.
- **FR-3.6** Эндпоинт `GET /recipes/:id/nutrition` возвращает:
  - `perServing: Nutrition`
  - `total: Nutrition`
  - `servings: number`
  - `incomplete: boolean` — был ли хотя бы один продукт без всех полей КБЖУ
  - `errors[]` — если есть, статус всё равно `200`, чтобы клиент мог
    показать «не хватает данных по продукту X».
- **FR-3.7** Эндпоинт `GET /menus/:id/nutrition`:
  - суммирует по всем `MenuRecipe` с учётом их `servings`,
  - возвращает `total: Nutrition` плюс разбивку `byRecipe[]`.

## 4. Нефункциональные

- **NFR-3.1** `Decimal` цепочка не теряется в JS-вычислениях при
  ингредиентах: используем `Number(prismaDecimal)` в одной точке, дальше
  только `number`. Поле `cookedAt` — `DateTime?`.
- **NFR-3.2** Чистые функции (`planConsumption`, `computeNutrition*`)
  тестируются без БД.
- **NFR-3.3** Атомарность списания подтверждается контрактом
  `prisma.$transaction` (на уровне Postgres). Тест на rollback —
  отдельным интеграционным шагом локально, в sandbox не валидируется.

## 5. Out of scope

- Frontend.
- История «приготовлений» как отдельная сущность (можно вытащить из
  `InventoryTxn` фильтром по `refType='MenuRecipe'`).
- Автоматический пересчёт КБЖУ при смене продукта (пересчёт на лету
  через эндпоинт уже даёт это бесплатно).

## 6. Изменения схемы

Минимальные:
- В `MenuRecipe` добавить `cookedAt DateTime?` и индекс по нему.
- В `InventoryTxn` оставить как есть — `refType='MenuRecipe'` достаточно.

## 7. Критерии приёмки

- [ ] Миграция `20260518210000_cooking` поднимает поле `cookedAt`.
- [ ] `cook` с достатком запасов возвращает `200` и инкрементирует
      `InventoryTxn` ровно на N продуктов, инвентарь падает на нужные количества.
- [ ] `cook` при дефиците возвращает `422`, инвентарь не меняется,
      `InventoryTxn` не пишется.
- [ ] Повторный `cook` → `409`.
- [ ] Юнит-тесты `planConsumption` и `computeNutrition*` зелёные.
- [ ] `GET /recipes/:id/nutrition` возвращает корректный КБЖУ для
      seed-рецепта «Простой томатный салат».
