# Дизайн — Фаза 3

## 1. Модули

```
src/
  cooking/
    cooking.module.ts
    cooking.controller.ts
    cooking.service.ts
    cooking-planner.ts          # pure: что и откуда списывать
    dto/cook.dto.ts
  nutrition/
    nutrition.module.ts
    nutrition.controller.ts
    nutrition.service.ts
    nutrition-calc.ts           # pure: суммирование КБЖУ по ингредиентам
```

Зависимости:
- `Cooking` → `Inventory`, `Units`.
- `Nutrition` → `Units` (для конверсии в base unit).
- Оба читают `Recipe`/`Product`/`Menu` через `PrismaService`.

## 2. Изменения схемы

```prisma
model MenuRecipe {
  // existing fields
  cookedAt DateTime?
}
```

Миграция `20260518210000_cooking`:
```sql
ALTER TABLE "menu_recipes" ADD COLUMN "cookedAt" TIMESTAMP(3);
CREATE INDEX "menu_recipes_cookedAt_idx" ON "menu_recipes"("cookedAt");
```

## 3. Cooking planner (pure)

```ts
type Loc = 'PANTRY' | 'FRIDGE' | 'FREEZER';

interface Need { productId: string; quantity: number; baseUnitId: string }
interface StockEntry { location: Loc; quantity: number }

interface PlanInput {
  needs: Need[];                                 // already in base unit
  stock: ReadonlyMap<string, StockEntry[]>;      // by productId, base unit
  preferLocation?: Loc;
  fallbackOrder: Loc[];                          // e.g. ['PANTRY','FRIDGE','FREEZER']
}

interface PlanLine {
  productId: string;
  baseUnitId: string;
  quantity: number;                              // total taken
  takeFrom: { location: Loc; quantity: number }[];
}

interface Shortage { productId: string; need: number; have: number }

interface PlanResult {
  ok: boolean;
  lines: PlanLine[];                             // empty if !ok
  shortages: Shortage[];
}
```

Алгоритм:
1. Для каждого `need`:
   - построить порядок локаций: сначала `preferLocation` (если задана),
     затем остальные из `fallbackOrder`, без дублей.
   - идти по локациям, забирать `min(remaining, stock_in_loc)`.
2. Если по продукту `remaining > eps` — добавить в `shortages`.
3. Если `shortages.length > 0` → `ok=false, lines=[]` (никаких частичных).

## 4. CookingService

Реальная запись только при `plan.ok`:

```
prisma.$transaction(async tx => {
  // load MenuRecipe, recipe, ingredients, products, conversions
  // build needs in base unit (fail loud on missing conversion)
  // load InventoryItem rows -> stock map
  // plan = planConsumption(...)
  // if !plan.ok -> throw 422 with shortages
  // for each line/take: decrement inventory + create InventoryTxn (negative qty)
  // mark MenuRecipe.cookedAt = now
})
```

Идемпотентность: если `mr.cookedAt` уже задан → 409 до любых изменений.

## 5. Nutrition

### `nutrition-calc.ts` (pure)

```ts
interface Nutrition { kcal: number; protein: number; fat: number; carbs: number }

interface ProductNutrition {
  baseUnitId: string;
  kcalPer100: number | null;
  proteinPer100: number | null;
  fatPer100: number | null;
  carbsPer100: number | null;
}

interface NutritionInputIngredient {
  productId: string;
  quantity: number;
  unitId: string;
}

interface ComputeArgs {
  ingredients: readonly NutritionInputIngredient[];
  products: ReadonlyMap<string, ProductNutrition>;
  convert: (qty: number, from: string, to: string, productId: string) => number | null;
  /** Multiplier applied to total. Defaults to 1. */
  scale?: number;
}

interface ComputeResult {
  nutrition: Nutrition;            // sum across all ingredients (after scale)
  incomplete: boolean;             // at least one product missing some per-100
  errors: {
    productId: string;
    reason: 'no_conversion' | 'unknown_product';
    fromUnitId?: string;
    baseUnitId?: string;
  }[];
}
```

Алгоритм:
- для каждого ингредиента: lookup продукт → если нет — `error`, skip;
  иначе конверсия к `baseUnit` → если null — `error`, skip;
  далее: `factor = baseQty / 100`, прибавляем поля per-100 если они не null;
  если хотя бы одно поле null — `incomplete=true`.
- в конце домножаем `nutrition` на `scale`.

### NutritionService

- `forRecipe(recipeId)`:
  - грузит рецепт + продукты + конверсии,
  - вызывает `computeNutritionForRecipe(scale=1)` → `total`,
  - `perServing = total / recipe.servings`,
  - возвращает `{ servings, perServing, total, incomplete, errors }`.
- `forMenu(menuId)`:
  - идёт по `MenuRecipe`, для каждого вызывает internal compute с
    `scale = mr.servings / recipe.servings` → это даёт нутриенты на
    весь объём этой позиции меню,
  - суммирует все `nutrition` в `total` меню,
  - возвращает `{ total, byRecipe: [{ menuRecipeId, recipeId, title, servings, nutrition, incomplete, errors }] }`.

## 6. REST контракты

| Method | Path | Body / query | Коды |
| --- | --- | --- | --- |
| POST | `/menu-recipes/:id/cook` | `{ preferLocation?: 'PANTRY'\|'FRIDGE'\|'FREEZER' }` | 200 / 404 / 409 / 422 / 400 |
| GET | `/recipes/:id/nutrition` | — | 200 / 404 |
| GET | `/menus/:id/nutrition` | — | 200 / 404 |

## 7. Тесты

`test/cooking-planner.spec.ts`:
- prefer-location используется первой,
- fallback в правильном порядке,
- дефицит → `ok=false`, `lines=[]`, `shortages` корректны,
- нет stock для продукта → shortage,
- 0-need ингредиент игнорируется,
- детерминированный порядок `lines` (по productId).

`test/nutrition.spec.ts`:
- 100 г помидора (18 ккал/100 г) → 18 ккал,
- 200 г муки + 100 г помидора → суммируются,
- конверсия `0.5 кг → 500 г`,
- продукт без `proteinPer100` → `incomplete=true`, остальные поля считаются,
- неизвестный продукт → `errors`, нутриенты не учтены,
- `scale=2` удваивает суммы.
