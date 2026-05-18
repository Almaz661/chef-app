# Design — Фаза 6.7: Заготовки

## 1. Модель данных

### 1.1. `RecipeGroup` (enum) — расширение

```
BREAKFAST   // Завтраки
SOUP        // Супы
MAIN        // Основные блюда
SALAD       // Салаты
BAKING      // Выпечка
DESSERT     // Десерты
DRINK       // Напитки
PREP        // Заготовки  (новое)
```

`recipes_group_idx` уже существует, дополнительных индексов не нужно.

### 1.2. `Product`

Добавляется одно поле:

```
isPrep  Boolean  @default(false)
```

Для всех существующих 100+ продуктов из seed остаётся `false`. На
заготовках в seed выставляется `true`.

`isPrep` нужен:
- фронту, чтобы помечать продукт значком «домашняя заготовка»;
- backend integrity tests, чтобы убедиться, что `Recipe.producesProductId`
  всегда указывает на продукт-заготовку.

### 1.3. `Recipe` — пять новых полей

```
producesProductId   String?              -> Product.id     (onDelete: SetNull)
prepYieldQuantity   Decimal? @db.Decimal(18, 4)
prepYieldUnitId     String?              -> Unit.id        (onDelete: Restrict логически)
prepDefaultLocation InventoryLocation?
prepShelfLifeDays   Int?
```

Инвариант: либо все пять `NULL` (обычный рецепт, поведение фаз 3–6.6
не меняется), либо все пять заполнены (рецепт-заготовка). Этот
инвариант:
- проверяется в `RecipesService` (Bad Request на частичные данные);
- проверяется тестом `catalog-integrity.spec.ts` для seed-данных.

DB-уровневый CHECK не вводим (потребовал бы ручную SQL-миграцию помимо
prisma migrate); сервис + тесты дают то же самое в нашем сценарии.

Дополнительный индекс `@@index([producesProductId])` ставим, чтобы
быстро находить рецепт по продукту-заготовке (UI: «как сделать ещё
бульона?»).

### 1.4. `InventoryTxnSource` — новое значение

```
PURCHASE
CONSUMPTION
ADJUSTMENT
INITIAL
PREP_PRODUCTION   (новое)
```

Когда срабатывает PREP-ветка `cook()`, мы пишем **две** транзакции:
- одну `CONSUMPTION` (как и сейчас) — на ингредиенты;
- ещё одну `PREP_PRODUCTION` — на полученную партию заготовки,
  `quantity > 0`, `unitId = prepYieldUnitId`, `refType = 'MenuRecipe'`,
  `refId = menuRecipeId`.

История становится «закрытой»: видно и расход ингредиентов, и приход
заготовки.

## 2. Pure helper `computePrepYield`

Чтобы оставить `CookingService.cook` тонким и тестируемым, выделяем
в `src/cooking/prep-yield.ts` чистую функцию:

```ts
export interface PrepYieldInput {
  producesProductId: string;
  prepYieldQuantity: number;        // > 0
  prepYieldUnitId: string;
  prepDefaultLocation: 'FRIDGE' | 'FREEZER';
  prepShelfLifeDays: number;        // > 0
  scale: number;                    // = mr.servings / recipe.servings
  now: Date;
}

export interface PrepYieldResult {
  productId: string;
  quantity: number;                 // = yield * scale
  unitId: string;
  location: 'FRIDGE' | 'FREEZER';
  expiresAt: Date;                  // = now + days
  acquiredAt: Date;                 // = now
}
```

Все валидации (`> 0`, `scale > 0`) внутри. На некорректные входы
функция бросает `Error`. CookingService оборачивает её в
`BadRequestException`.

Тесты на эту функцию покрывают:
- базовый случай scale = 1 (бульон 1.5 л → партия 1.5 л);
- удвоение порций (scale = 2 → 3 л);
- половинная порция (scale = 0.5 → 0.75 л);
- expiresAt считается ровно через N дней от `now`;
- FREEZER против FRIDGE — параметр пробрасывается без интерпретации;
- yield ≤ 0 / shelfLife ≤ 0 → ошибка.

## 3. CookingService — изменения

```ts
async cook(menuRecipeId: string, dto: CookDto) {
  return this.prisma.$transaction(async (tx) => {
    // 1. читаем MenuRecipe + Recipe (теперь дополнительно: producesProductId,
    //    prepYieldQuantity, prepYieldUnitId, prepDefaultLocation,
    //    prepShelfLifeDays, group)
    // 2. валидируем PREP-инвариант: либо все 5 заполнены, либо все NULL
    // 3. строим needs, planning, drain — как было
    // 4. если recipe.producesProductId != null:
    //      const out = computePrepYield({...recipe, scale, now});
    //      создаём InventoryItem
    //      пишем InventoryTxn(PREP_PRODUCTION)
    //      добавляем в ответ `produced`
    // 5. помечаем cookedAt
  });
}
```

Что **не** меняется:
- порядок `CONSUMPTION` транзакций;
- структура `consumed` в ответе;
- error-маппинг (NotFound / Conflict / 422 shortages);
- order операций для рецептов без заготовки → байт-в-байт обратная совместимость.

Если рецепт PREP, но в инвентаре не хватает ингредиентов — ничего не
произойдёт (UnprocessableEntity, как раньше). Это корректное
поведение: партия заготовки не появится, потому что транзакция
откатится.

## 4. Inventory location resolution

`prepDefaultLocation` — это **рецепт-уровневый** дефолт для готовой
партии. На фазе 6.7 вычисляется напрямую:

```ts
const location = recipe.prepDefaultLocation; // 'FRIDGE' | 'FREEZER'
```

Возможность пользователю переопределить локацию (`dto.outputLocation`)
оставляем на следующую фазу — UI ещё не готов её прокинуть.

`dto.preferLocation` (откуда **списывать** ингредиенты) при этом
остаётся как было.

## 5. DTO

### 5.1. `CreateRecipeDto` / `UpdateRecipeDto`

Дополнительно:

```ts
group?: 'BREAKFAST' | ... | 'PREP'    // расширяем enum DTO
producesProductId?: string
prepYieldQuantity?: number            // > 0
prepYieldUnitId?: string
prepDefaultLocation?: 'FRIDGE' | 'FREEZER'
prepShelfLifeDays?: number            // 1..3650
```

Валидация коцов: либо все 5 PREP-полей переданы, либо ни одного.
Делаем кастом-валидатор (или явную проверку в сервисе) — берём второй
путь, чтобы не плодить декораторы.

### 5.2. `CookDto`

Не меняется.

## 6. Seed

### 6.1. 10 продуктов-заготовок (`isPrep = true`)

Все базовые единицы соответствуют разумной мере хранения партии.

| slug                         | name                       | base | категория        | shelfLife | location |
|------------------------------|----------------------------|------|------------------|-----------|----------|
| `prep-chicken-broth`         | Куриный бульон             | ml   | Заготовки        | 90        | FREEZER  |
| `prep-beef-broth`            | Говяжий бульон             | ml   | Заготовки        | 90        | FREEZER  |
| `prep-vegetable-broth`       | Овощной бульон             | ml   | Заготовки        | 180       | FREEZER  |
| `prep-shortcrust-dough`      | Песочное тесто             | g    | Заготовки        | 30        | FREEZER  |
| `prep-yeast-dough`           | Дрожжевое тесто            | g    | Заготовки        | 30        | FRIDGE   |
| `prep-pelmeni-mince`         | Фарш для пельменей         | g    | Заготовки        | 90        | FREEZER  |
| `prep-soffritto`             | Зажарка (лук+морковь)      | g    | Заготовки        | 180       | FREEZER  |
| `prep-bolognese-sauce`       | Соус болоньезе             | g    | Заготовки        | 90        | FREEZER  |
| `prep-tomato-sauce`          | Базовый томатный соус      | g    | Заготовки        | 180       | FREEZER  |
| `prep-berry-puree`           | Ягодное пюре               | g    | Заготовки        | 180       | FREEZER  |

KBJU выставлены вручную (примерные значения для готовых заготовок).
`tags` — где есть смысл, проставляем `vegetarian`, `vegan` и т.п.

### 6.2. 10 рецептов-заготовок (`group = 'PREP'`)

Для каждого рецепта:
- ингредиенты ссылаются на уже существующие 100+ продуктов;
- `producesProductId` указывает на соответствующий продукт-заготовку
  (по slug — резолв в `seed.ts`);
- `prepYield*` / `prepDefaultLocation` / `prepShelfLifeDays` —
  согласно таблице ниже.

| recipe slug                       | производит                | yield      | shelfLife | location |
|-----------------------------------|---------------------------|------------|-----------|----------|
| `recipe-prep-chicken-broth`       | prep-chicken-broth        | 1500 ml    | 90        | FREEZER  |
| `recipe-prep-beef-broth`          | prep-beef-broth           | 1500 ml    | 90        | FREEZER  |
| `recipe-prep-vegetable-broth`     | prep-vegetable-broth      | 1500 ml    | 180       | FREEZER  |
| `recipe-prep-shortcrust-dough`    | prep-shortcrust-dough     | 500 g      | 30        | FREEZER  |
| `recipe-prep-yeast-dough`         | prep-yeast-dough          | 700 g      | 30        | FRIDGE   |
| `recipe-prep-pelmeni-mince`       | prep-pelmeni-mince        | 800 g      | 90        | FREEZER  |
| `recipe-prep-soffritto`           | prep-soffritto            | 500 g      | 180       | FREEZER  |
| `recipe-prep-bolognese-sauce`     | prep-bolognese-sauce      | 1000 g     | 90        | FREEZER  |
| `recipe-prep-tomato-sauce`        | prep-tomato-sauce         | 800 g      | 180       | FREEZER  |
| `recipe-prep-berry-puree`         | prep-berry-puree          | 500 g      | 180       | FREEZER  |

`servings = 1` для всех — заготовка готовится «партией», масштабирование
осуществляется через `MenuRecipe.servings` (повар поставит 2x, чтобы
удвоить выход).

### 6.3. Loader

`prisma/data/products-prep.ts` — экспорт `PREPS: SeedProduct[]` (с уже
проставленным `isPrep: true`).

`prisma/data/recipes-prep.ts` — экспорт `PREP_RECIPES: SeedRecipe[]`,
плюс расширяем `SeedRecipe` опциональными полями:

```ts
producesProductSlug?: string
prepYieldQuantity?: number
prepYieldUnitId?: string
prepDefaultLocation?: 'FRIDGE' | 'FREEZER'
prepShelfLifeDays?: number
```

`seed.ts` мерджит `PREPS` в `ALL_PRODUCTS`, `PREP_RECIPES` в общий
список рецептов; разрешает `producesProductSlug → productId` после
вставки продуктов и до вставки рецептов.

## 7. API surface

- `GET /recipes?group=PREP` — отдельная вкладка «Заготовки» (уже
  работает благодаря фазе 6.6).
- `GET /recipes/groups` — теперь возвращает 8 элементов + UNGROUPED.
- `POST /recipes`, `PATCH /recipes/:id` — принимают новые поля.
- `POST /menu-recipes/:id/cook` — добавляется поле `produced` в ответе
  для PREP-рецептов.

Никаких новых endpoint'ов в этой фазе.

## 8. Тестовая стратегия

Без поднятия PostgreSQL — pure unit. Покрытие:

1. `test/prep-yield.spec.ts` (новый) — 6+ кейсов по `computePrepYield`.
2. `test/catalog-integrity.spec.ts` (расширение):
   - каждый PREP-продукт `isPrep = true` и в категории «Заготовки»;
   - каждый PREP-рецепт указывает `producesProductSlug`, и этот slug
     присутствует среди PREP-продуктов;
   - все 5 PREP-полей либо все заполнены, либо все NULL;
   - группа `PREP` существует в seed (хотя бы один рецепт).
3. Регрессия: все 88 тестов из фаз 1–6.6 остаются зелёными.

Дополнительно — smoke-test `RecipesService` на инвариант (либо все 5,
либо ни одного) делается через юнит-тест без БД (мок prisma) — но
если время поджимает, ограничиваемся integrity-тестом seed.

## 9. Risks & decisions

- **Yield в неудобной единице.** Фарш в 800 g, бульон в ml — разные
  baseUnit'ы, и юзер может позже захотеть `pcs` («4 порции песочного
  теста»). Сделано: `prepYieldUnitId` хранится отдельно, не привязан к
  `Product.baseUnitId`. Конвертация на стороне инвентаря/cook через
  `UnitConverterService` уже умеет product-specific conversions.
- **Что если у заготовки кончился срок?** Это решается фазой 4
  (FEFO + alerts), для PREP-партий ничего нового не нужно.
- **Можно ли сделать заготовку из заготовки** (например, болоньезе из
  фарша + соуса)? Да, по архитектуре можно: `recipe-prep-bolognese-sauce`
  использует обычные ингредиенты, но ничто не мешает добавить ссылку на
  `prep-tomato-sauce` среди ингредиентов. В seed мы пока этого не
  делаем — упрощает интеграционные сценарии.
- **DB CHECK constraint «все 5 или ничего».** Не вводим (см. 1.3).
  Стоимость: integrity-тест против seed + сервис-валидация на API.
