# Tasks — Фаза 1

## T1. Бутстрап проекта
- `package.json` (NestJS 10, Prisma 5, TS 5, Zod, class-validator).
- `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`.
- `.gitignore`, `.env.example`, `README.md`.

## T2. Prisma
- `prisma/schema.prisma` со всеми моделями из `design.md` §2.
- Расширение `pg_trgm` через `migration.sql` (raw SQL миграция в `prisma/migrations/0001_init/`).

## T3. PrismaModule + AppModule
- `prisma.service.ts` (extends `PrismaClient`, `onModuleInit` — connect, `enableShutdownHooks`).
- Подключение `ConfigModule` глобально.

## T4. ProductsModule
- CRUD `Product` (slug-уникальность, валидация).
- `POST /products/:id/aliases` — добавить алиас.
- `DELETE /products/:id/aliases/:aliasId`.

## T5. MatchingModule
- `units-dictionary.ts` — карта синонимов.
- `text-normalize.ts` — нормализация строк.
- `ingredient-parser.ts` — `parseIngredient(raw)`.
- `matching.service.ts` — `resolve(parsed)` (точный → fuzzy через `$queryRaw similarity`).
- `MATCH_STRONG=0.65`, `MATCH_WEAK=0.45` через `ConfigService`.
- `MatchingController`: `GET /matching/queue`, `POST /matching/queue/:id/resolve`.

## T6. RecipesModule
- CRUD `Recipe`.
- `POST /recipes/:id/ingredients` — принимает массив `(string | structured)`,
  делегирует `MatchingService`, создаёт `RecipeIngredient` или ставит в очередь.

## T7. Seed
- `prisma/seed.ts` создаёт:
  - 8 единиц измерения,
  - глобальные конверсии (`kg↔g`, `l↔ml`),
  - 4 продукта (соль, мука, оливковое масло, помидор) + алиасы,
  - 1 рецепт «Простой томатный салат» со строковыми ингредиентами,
    которые все должны успешно смэтчиться.
- Добавить `npm run seed` в `package.json`.

## T8. Документация и PR
- Заполнить `README.md`: запуск, миграции, seed, эндпоинты.
- Ветка `phase-1/product-master`, PR на `main`.

## Definition of Done
- [ ] Все файлы из секций T1–T7 присутствуют.
- [ ] `npm install` без ошибок (опционально — оффлайн-сборку не валидируем в Фазе 1).
- [ ] Спека в `.kiro/specs/phase-1-product-master/` зафиксирована в репо.
- [ ] PR открыт и описывает scope Фазы 1.
