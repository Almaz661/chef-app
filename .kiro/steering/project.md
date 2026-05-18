# ШефДом — проектные конвенции

Эти правила применяются ко всему репозиторию `chef-app`. Нарушать только
с явной пометкой «отступаем от steering, причина: …» в PR.

## Стек

- **Node.js 20+, TypeScript 5 strict** (см. `tsconfig.json`).
- **NestJS 10** — модули, controllers, services. Глобальная `ValidationPipe`
  с `whitelist: true, forbidNonWhitelisted: true, transform: true`.
- **Prisma 5 + PostgreSQL 15** — единственная БД, единственный источник
  правды для схемы. Никакого ручного DDL мимо миграций.
- **`pg_trgm`** — обязательное расширение, используется для fuzzy-матчинга.
- **class-validator + class-transformer** — валидация HTTP DTO.
- **Vitest** — тесты в проде. **`bun:test`** — запасной runner для случаев,
  когда `npm install` недоступен (см. `test/parser.spec.ts`).

## Структура каталогов

```
src/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  dto/
prisma/
  schema.prisma
  migrations/
  seed.ts
.kiro/specs/<phase-name>/{requirements,design,tasks}.md
```

Глобальный `PrismaModule` (`@Global`) — все доменные модули получают
`PrismaService` через DI без повторных импортов.

## Соглашения по данным

- **Никаких «свободных» строковых ингредиентов** в `RecipeIngredient`.
  Поле `productId` — `NOT NULL`, FK на `Product`. Исходная строка
  хранится только как `rawText` (для отображения и аудита).
- **`ProductAlias.normalizedText`** должен формироваться через
  `normalizeText()` из `src/matching/text-normalize.ts` — и при записи,
  и при поиске. Иначе exact-матч сломается.
- Локаль данных по умолчанию — `ru`. `ProductAlias.locale` готов к мульти-
  локали; новые алиасы создавать с явной локалью.
- `Decimal(18, 4)` для `quantity`, `Decimal(18, 6)` для `factor`.
  Никаких `Float` для количеств и переводов.
- Все таблицы в `snake_case` через `@@map`. Колонки в Prisma — `camelCase`
  (стандарт), физические имена через `@map` если нужно.

## Матчинг ингредиентов (фаза 1)

Трёхуровневый каскад:
1. **Exact** — `ProductAlias.normalizedText` strict equality.
2. **Fuzzy** — `pg_trgm similarity()` поверх алиасов, top-3,
   `score >= MATCH_STRONG` (0.65 по умолчанию) → success.
3. **Ambiguous / none** — кладём в `IngredientMatchQueue`.

Пороги читаются из `ConfigService` (`MATCH_STRONG`, `MATCH_WEAK`).
Не хардкодить.

## Стиль

- Импорты: внешние → relative `..` → relative `.`. Между группами пустая
  строка. Prettier и ESLint конфиги в репо — `npm run lint` / `format`.
- Контроллеры — тонкие. Бизнес-логика в сервисах. Парсинг и нормализация —
  чистые функции в отдельных файлах (тестируются без БД).
- Не глотать ошибки Prisma. `P2002` → `ConflictException`, `P2025` →
  `NotFoundException`. Остальное — наверх.

## Спецификации

Каждая фаза начинается со спеки в `.kiro/specs/<phase-name>/`:
- `requirements.md` — что и зачем (FR/NFR + критерии приёмки).
- `design.md` — как (модели, алгоритмы, REST контракты).
- `tasks.md` — список задач с DoD.

Без спеки — не начинаем.

## Тесты

- Парсер и матчинг покрываются unit-тестами (без БД) обязательно.
- CRUD-сервисы покрываются по требованию (контракты валидируются на
  уровне DTO + Prisma).
- Все тесты — детерминированные. Никаких таймстемпов в expected.

## Git

- Одна фаза = одна feature-ветка `phase-N/<short-slug>` → PR в `main`.
- Сообщения коммитов: первая строка — «что», тело — «почему» и список
  ключевых решений (если их > 1).
- Force-push в `main` запрещён. В feature-ветку — только при явном
  запросе.
