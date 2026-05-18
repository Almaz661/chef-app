# Tasks — Фаза 5

## T1. Pure formatter
- `src/history/cooking-history.ts` — `formatConsumed(txns, products)`.
- `test/cooking-history.spec.ts` — 5 кейсов.

## T2. DTO + Module
- `dto/list-history.dto.ts` (with class-validator).
- `history.module.ts` (только PrismaService).

## T3. HistoryService
- `listEvents(filter)`,
- `forRecipe(recipeId)`,
- `stats(days)`.
- Все агрегации через `prisma.groupBy/count`, никакого in-memory подсчёта.

## T4. HistoryController
- `GET /cooking/history`,
- `GET /recipes/:id/cooking-history`,
- `GET /cooking/stats`.

## T5. AppModule wiring
- Подключить `HistoryModule`.

## T6. README + PR
- Обновить таблицу REST.
- Ветка `phase-5/cooking-history` → `main`.

## DoD
- [ ] 56 + новые тесты зелёные.
- [ ] Спека закоммичена.
- [ ] PR открыт.
