# Фаза 5 — История приготовлений

## 1. Цель

Дать пользователю простой ответ на вопросы:
- «что я готовила на этой неделе?»
- «когда последний раз готовила X?»
- «какой рецепт у меня в фаворитах — что чаще всего готовлю?»

Технически вся информация уже есть: в `MenuRecipe.cookedAt` записывается
момент готовки, в `InventoryTxn(source=CONSUMPTION, refType='MenuRecipe',
refId=...)` лежат списания. Фаза 5 ничего нового **не пишет** — она только
**читает** уже существующие данные и даёт три удобных эндпоинта.

## 2. Что считаем (определения)

- **Готовка (CookEvent)** — одна запись `MenuRecipe` с непустым `cookedAt`.
  Идентификатор события = `menuRecipeId`.
- **Раз приготовил рецепт** = одна `CookEvent` с этим `recipeId`.
  Несколько порций в одном вызове `cook` всё равно считаются за **одну**
  готовку (мы готовим блюдо, а не каждую порцию по отдельности).

## 3. Функциональные требования

- **FR-5.1.** `GET /cooking/history` возвращает все события готовки
  отсортированные по времени **по убыванию** (самое свежее — первым).
  Параметры (всё опциональные):
  - `from`, `to` — ISO-даты, фильтр по `cookedAt`,
  - `recipeId` — только конкретный рецепт,
  - `menuId` — только готовки из конкретного меню,
  - `limit` (1..200, default 50), `offset` (default 0).
  Ответ: `{ items: CookEvent[], total: number }`.

- **FR-5.2.** Каждый `CookEvent` содержит:
  ```
  {
    menuRecipeId, menuId, menuName,
    recipeId, recipeSlug, recipeTitle, recipeServings,
    cookedServings,        // mr.servings (сколько порций приготовили)
    cookedAt: ISO,
    consumed: [             // по одной строке на продукт
      { productId, productName, quantity, baseUnitId }
    ]
  }
  ```
  `consumed` достаётся join-ом `InventoryTxn` по
  `refType='MenuRecipe' AND refId=menuRecipeId AND source='CONSUMPTION'`.
  Количества показываются положительными (в БД хранятся отрицательными,
  для UI инвертируем).

- **FR-5.3.** `GET /recipes/:id/cooking-history` — то же самое, но уже
  отфильтровано по конкретному рецепту. Возвращает структуру
  `{ recipe: { id, slug, title }, lastCookedAt: ISO|null,
     timesCooked: number, items: CookEvent[] }`. Без пагинации
  (рецепт в среднем редко готовится, целиком влезет).

- **FR-5.4.** `GET /cooking/stats?days=N` — сводка за последние N дней
  (по умолчанию 30, max 365):
  ```
  {
    days: N,
    totalCooks: number,                    // всего готовок
    distinctRecipes: number,               // уникальных рецептов
    topRecipes: [                          // top-5 по убыванию
      { recipeId, recipeTitle, count, lastCookedAt }
    ]
  }
  ```
  Список `topRecipes` сортируется по `count desc, lastCookedAt desc`.

## 4. Нефункциональные

- **NFR-5.1.** Никаких изменений схемы. Только новый модуль `history/`.
- **NFR-5.2.** Все аггрегации делаются **в БД** (Prisma `groupBy` /
  `count`), не вытаскиваем тысячи строк в Node ради подсчёта.
- **NFR-5.3.** Чистая часть (форматирование `consumed` из массива
  `InventoryTxn`) вынесена в `cooking-history.ts`, тестируется без БД.

## 5. Out of scope

- Экспорт в CSV.
- Графики / визуализация.
- Frontend.
- Учёт «сколько порций в итоге съели vs приготовили» (`MenuRecipe.servings`
  считается «приготовлено», независимо от того, доели или нет).

## 6. Критерии приёмки

- [ ] `GET /cooking/history` возвращает все готовки в обратном
      хронологическом порядке.
- [ ] Фильтры `from`/`to`/`recipeId`/`menuId` работают и комбинируются.
- [ ] `consumed` показывает положительные количества и корректные
      `productName` + `baseUnitId`.
- [ ] `GET /recipes/:id/cooking-history` возвращает `timesCooked=0` и
      `lastCookedAt=null` для рецепта, который ещё ни разу не готовили,
      и не падает с 404.
- [ ] `GET /cooking/stats?days=7` возвращает 200 даже на пустой БД.
- [ ] Юнит-тест на чистый форматтер `formatConsumed` зелёный.
- [ ] Все 56 предыдущих тестов остаются зелёными (регрессия).
