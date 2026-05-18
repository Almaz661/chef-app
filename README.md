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

## REST endpoints (Фаза 1)

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

Подробнее — в `.kiro/specs/phase-1-product-master/`.
