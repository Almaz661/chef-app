# Дизайн — Фаза 5

## 1. Модуль

```
src/history/
  history.module.ts
  history.controller.ts
  history.service.ts
  cooking-history.ts            # pure: форматирование consumed
  dto/list-history.dto.ts
```

Зависимостей мало: только `PrismaService`. Никаких новых таблиц.

## 2. Контракт `cooking-history.ts` (pure)

```ts
interface RawTxn {
  productId: string;
  quantity: number;       // negative in DB; we'll invert here
  unitId: string;
}

interface ProductInfo {
  id: string;
  name: string;
}

interface ConsumedItem {
  productId: string;
  productName: string;
  quantity: number;       // positive
  baseUnitId: string;
}

formatConsumed(
  txns: RawTxn[],
  products: ReadonlyMap<string, ProductInfo>,
): ConsumedItem[];
```

Алгоритм:
1. Для каждой `RawTxn`:
   - `quantity = -txn.quantity` (инвертируем, обнуляем минус),
   - `productName = products.get(productId)?.name ?? '(unknown)'`,
2. Группируем по `productId` (на одну готовку может прийтись несколько
   списаний при наличии нескольких партий — Phase 4),
3. Сортируем по `productName` для стабильности.

## 3. `HistoryService`

```ts
listEvents(filter: ListHistoryDto): Promise<{ items: CookEvent[]; total: number }>;

forRecipe(recipeId: string): Promise<{
  recipe: { id, slug, title };
  lastCookedAt: Date | null;
  timesCooked: number;
  items: CookEvent[];
}>;

stats(days: number): Promise<{
  days: number;
  totalCooks: number;
  distinctRecipes: number;
  topRecipes: Array<{ recipeId, recipeTitle, count, lastCookedAt }>;
}>;
```

### `listEvents`

```sql
-- Базовый запрос (Prisma):
menuRecipe
  where: { cookedAt: { not: null }, ...filter }
  orderBy: { cookedAt: desc }
  take/skip: limit/offset
  include: { recipe, menu }
```

Затем одной выборкой грузим `InventoryTxn`:

```sql
where: refType='MenuRecipe' AND refId IN (...) AND source='CONSUMPTION'
```

И одной — `Product` для всех затронутых productId. Дальше — pure
`formatConsumed`.

`total` = `menuRecipe.count(where: ...)`.

### `forRecipe`

```ts
const recipe = prisma.recipe.findUnique({ where: { id }, select: ... });
if (!recipe) throw NotFound;
const items = listEvents({ recipeId, limit: 200 });
return { recipe, items, lastCookedAt: items[0]?.cookedAt ?? null,
         timesCooked: items.length };
```

### `stats`

```ts
const since = new Date(now - days*24*60*60*1000);
const totalCooks = prisma.menuRecipe.count({ where: { cookedAt: { gte: since } } });

// distinctRecipes + top
const grouped = prisma.menuRecipe.groupBy({
  by: ['recipeId'],
  where: { cookedAt: { gte: since } },
  _count: { recipeId: true },
  _max:   { cookedAt: true },
  orderBy: [{ _count: { recipeId: 'desc' } }, { _max: { cookedAt: 'desc' } }],
  take: 5,
});

const recipes = prisma.recipe.findMany({ where: { id: { in: grouped.map(...) } }, select: { id, title } });

return {
  days,
  totalCooks,
  distinctRecipes: grouped.length, // если нужно точнее — отдельный count
  topRecipes: grouped.map(g => ({
    recipeId: g.recipeId,
    recipeTitle: recipes.get(g.recipeId)?.title ?? '(deleted)',
    count: g._count.recipeId,
    lastCookedAt: g._max.cookedAt!,
  })),
};
```

`distinctRecipes` берём через отдельный `count` с `distinct` или
`groupBy(...).then(rows => rows.length)` — в Phase 5 второй вариант
дешевле и достаточен (top-5 редко выбьет лимит).

## 4. DTO

```ts
class ListHistoryDto {
  from?: string;       // ISO
  to?: string;         // ISO
  recipeId?: string;
  menuId?: string;
  limit?: number;      // 1..200, default 50
  offset?: number;     // default 0
}
```

## 5. REST контракты

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/cooking/history` | filters via query |
| GET | `/recipes/:id/cooking-history` | per-recipe view, no pagination |
| GET | `/cooking/stats?days=N` | 30 default, max 365 |

## 6. Тесты

`test/cooking-history.spec.ts`:
- инвертирует знак (`-300` → `300`),
- ищет имя продукта в карте,
- неизвестный продукт → `'(unknown)'` (не падаем),
- группирует несколько txns одного продукта в одну строку,
- сортировка по `productName` детерминирована.

В DoD остаются 56 предыдущих тестов + 5 новых = 61.
