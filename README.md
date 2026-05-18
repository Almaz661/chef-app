# ШефДом — Backend

Backend для приложения ШефДом (рецепты, продукты, питание).

## Стек

- Node.js 20, TypeScript 5
- NestJS 10
- PostgreSQL 15+ с расширением `pg_trgm`
- Prisma 5

## Структура

```
src/
  main.ts
  app.module.ts
  prisma/                 # PrismaService
  products/               # CRUD продуктов и алиасов
  recipes/                # CRUD рецептов и ингредиентов
  matching/               # парсер строк + матчинг + очередь
prisma/
  schema.prisma
  seed.ts
.kiro/specs/phase-1-product-master/   # спецификация Фазы 1
```

## Локальный запуск

1. Установить зависимости:
   ```bash
   npm install
   ```
2. Поднять PostgreSQL (например, через Docker):
   ```bash
   docker run --name chefdom-pg -e POSTGRES_USER=chef -e POSTGRES_PASSWORD=chef \
     -e POSTGRES_DB=chefdom -p 5432:5432 -d postgres:15
   ```
3. Скопировать `.env.example` → `.env` и при необходимости поправить.
4. Применить миграции и засеять данные:
   ```bash
   npm run prisma:migrate
   npm run seed
   ```
5. Старт dev-сервера:
   ```bash
   npm run start:dev
   ```

## REST endpoints

### Product Master (Phase 1)

| Метод   | Путь                                  | Назначение |
| ------- | ------------------------------------- | ---------- |
| GET     | `/products`                           | Список продуктов |
| POST    | `/products`                           | Создать продукт |
| GET     | `/products/:id`                       | Получить продукт |
| PATCH   | `/products/:id`                       | Изменить продукт |
| DELETE  | `/products/:id`                       | Удалить продукт |
| POST    | `/products/:id/aliases`               | Добавить алиас |
| DELETE  | `/products/:id/aliases/:aliasId`      | Удалить алиас |
| GET     | `/recipes`                            | Список рецептов |
| POST    | `/recipes`                            | Создать рецепт |
| GET     | `/recipes/:id`                        | Получить рецепт |
| PATCH   | `/recipes/:id`                        | Изменить рецепт |
| DELETE  | `/recipes/:id`                        | Удалить рецепт |
| POST    | `/recipes/:id/ingredients`            | Добавить ингредиенты (строки/structured) |
| GET     | `/matching/queue`                     | Очередь нерешённых ингредиентов |
| POST    | `/matching/queue/:id/resolve`         | Привязать строку к продукту |

### Menu / Shopping / Inventory (Phase 2)

| Метод | Путь | Назначение |
| --- | --- | --- |
| POST | `/menus` | Создать меню |
| GET | `/menus`, `/menus/:id` | Список / детали меню |
| PATCH | `/menus/:id` | Изменить меню |
| DELETE | `/menus/:id` | Удалить меню |
| POST | `/menus/:id/recipes` | Добавить рецепт в меню (`servings` опционально) |
| DELETE | `/menus/:id/recipes/:menuRecipeId` | Убрать рецепт из меню |
| POST | `/menus/:id/shopping-list` | Сгенерировать список покупок |
| GET | `/shopping-lists/:id` | Получить список покупок |
| PATCH | `/shopping-lists/:listId/items/:itemId/purchase` | Отметить позицию купленной → автоматически в инвентарь (атомарно) |
| GET | `/inventory` | Запасы (фильтры: `productId`, `location`) |
| POST | `/inventory/adjust` | Ручная корректировка остатков с обязательным `note` |

End-to-end сценарий «Меню → Покупки → Инвентарь» закрыт в одной транзакции
на шаге `markPurchased`: либо все три записи (item / inventory / audit)
успешны, либо ни одна — состояния «отметил купленным, но в инвентаре
пусто» возникнуть не может.

### Cooking & Nutrition (Phase 3)

| Метод | Путь | Назначение |
| --- | --- | --- |
| POST | `/menu-recipes/:id/cook` | Пометить позицию меню приготовленной → атомарно списать ингредиенты из инвентаря (CONSUMPTION); 422 при дефиците с разбивкой по продуктам, 409 при повторном вызове |
| GET | `/recipes/:id/nutrition` | КБЖУ рецепта: на порцию, на всю партию, флаг `incomplete`, список ошибок по отсутствующим конверсиям |
| GET | `/menus/:id/nutrition` | Суммарный КБЖУ меню + разбивка по `byRecipe[]` |

Списание тоже идёт в одной `prisma.$transaction`: либо все
`InventoryItem.decrement` + `InventoryTxn(CONSUMPTION)` + `MenuRecipe.cookedAt`
проходят успешно, либо никакие изменения не сохраняются. План списания
строит чистая функция `planConsumption` с приоритетом локаций
`preferLocation → PANTRY → FRIDGE → FREEZER`.

Подробнее — в `.kiro/specs/`.


### Expiry & Alerts (Phase 4)

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET | `/alerts/expiring?days=N` | Партии, у которых `expiresAt < now` (`status=EXPIRED`) или `now <= expiresAt <= now + N дней` (`status=SOON`); по умолчанию `days=3` |
| GET | `/alerts/expiring/count?days=N` | Числа для бейджа: `{ expired, soon }` |
| PATCH | `/shopping-lists/:listId/items/:itemId/purchase` | + поле `expiresAt?: ISO date` — попадёт на новую партию в инвентаре |
| POST | `/inventory/adjust` | + поле `expiresAt?` для положительной корректировки; отрицательная списывает по FEFO |

Фаза 4 разрешает несколько партий одного продукта в одной локации.
Каждая покупка / положительная корректировка создаёт **отдельную партию**
(`InventoryItem`) с собственным `expiresAt` и `acquiredAt`. Готовка и
отрицательные корректировки списывают **FEFO** (first-expire-first-out):
сначала просроченное, затем по `expiresAt asc` (партии без срока — в
самом конце), tiebreak по `acquiredAt`. Опустевшие партии удаляются.
Решение принимает чистая функция `pickBatches`.
