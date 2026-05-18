# Дизайн — Фаза 1: Product Master

## 1. Архитектура (модули)

```
src/
  app.module.ts
  main.ts
  prisma/
    prisma.module.ts
    prisma.service.ts
  products/
    products.module.ts
    products.controller.ts
    products.service.ts
    dto/
      create-product.dto.ts
      update-product.dto.ts
      create-alias.dto.ts
  recipes/
    recipes.module.ts
    recipes.controller.ts
    recipes.service.ts
    dto/
      create-recipe.dto.ts
      add-ingredients.dto.ts
  matching/
    matching.module.ts
    matching.controller.ts
    matching.service.ts        # точный + fuzzy
    ingredient-parser.ts       # чистая функция, без зависимостей
    units-dictionary.ts        # карта синонимов единиц
    text-normalize.ts          # lowercase, trim, schwa-fold, ё→е
prisma/
  schema.prisma
  seed.ts
```

Зависимости:
- `Recipes` -> `Matching` -> `Products` -> `Prisma`.
- `Matching` — единственное место, где живёт правило «как строка превращается в `RecipeIngredient`».

## 2. Модель данных (Prisma)

```prisma
model Product {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  category    String?
  baseUnitId  String
  baseUnit    Unit     @relation(fields: [baseUnitId], references: [id])
  kcalPer100  Float?
  proteinPer100 Float?
  fatPer100   Float?
  carbsPer100 Float?
  tags        String[] @default([])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  aliases     ProductAlias[]
  conversions UnitConversion[]
  ingredients RecipeIngredient[]
}

model ProductAlias {
  id              String  @id @default(cuid())
  productId       String
  product         Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  text            String
  normalizedText  String
  locale          String  @default("ru")

  @@unique([normalizedText, locale])
  @@index([productId])
}

model Unit {
  id        String  @id            // 'g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'pcs', 'pinch'
  name      String
  kind      UnitKind                // MASS | VOLUME | COUNT | OTHER

  productsBase    Product[]
  ingredients     RecipeIngredient[]
  conversionsFrom UnitConversion[]   @relation("FromUnit")
  conversionsTo   UnitConversion[]   @relation("ToUnit")
}

enum UnitKind {
  MASS
  VOLUME
  COUNT
  OTHER
}

model UnitConversion {
  id         String   @id @default(cuid())
  productId  String?              // null = глобальное правило
  product    Product? @relation(fields: [productId], references: [id], onDelete: Cascade)
  fromUnitId String
  fromUnit   Unit     @relation("FromUnit", fields: [fromUnitId], references: [id])
  toUnitId   String
  toUnit     Unit     @relation("ToUnit", fields: [toUnitId], references: [id])
  factor     Decimal  @db.Decimal(18, 6)  // 1 fromUnit = factor * toUnit

  @@unique([productId, fromUnitId, toUnitId])
}

model Recipe {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  description String?
  servings    Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  ingredients RecipeIngredient[]
}

model RecipeIngredient {
  id        String   @id @default(cuid())
  recipeId  String
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Decimal  @db.Decimal(18, 4)
  unitId    String
  unit      Unit     @relation(fields: [unitId], references: [id])
  rawText   String?
  note      String?
  position  Int      @default(0)

  @@index([recipeId])
  @@index([productId])
}

model IngredientMatchQueue {
  id         String   @id @default(cuid())
  recipeId   String?
  rawText    String
  parsedName String
  quantity   Decimal? @db.Decimal(18, 4)
  unitId     String?
  reason     String   // 'no_match' | 'ambiguous'
  candidates Json?    // [{ productId, score }]
  createdAt  DateTime @default(now())
}
```

## 3. Парсинг строки ингредиента

Чистая функция `parseIngredient(raw: string): ParsedIngredient`.
Алгоритм (ru-локаль, простая регулярка-стратегия, без NLP):

1. Нормализация: lowercase, `ё→е`, `,→.` для дробей, `½→0.5`, схлопывание пробелов.
2. Сначала пытаемся снять `quantity` с начала строки:
   - целое (`2`), десятичное (`0.5`), дробь (`1/2`), диапазон (`2-3` → берём первое число + флаг `range`).
3. Затем — `unit` по словарю `UNIT_SYNONYMS` (см. ниже).
4. Всё, что осталось, — кандидат на `name`. Скобочные хвосты (`(...)`) → `note`.

`UNIT_SYNONYMS` (фрагмент):
```ts
{
  'г': 'g', 'гр': 'g', 'грамм': 'g', 'граммов': 'g',
  'кг': 'kg', 'килограмм': 'kg',
  'мл': 'ml', 'миллилитр': 'ml',
  'л': 'l', 'литр': 'l',
  'ст.л.': 'tbsp', 'ст л': 'tbsp', 'столовая ложка': 'tbsp', 'ст.ложка': 'tbsp',
  'ч.л.': 'tsp', 'ч л': 'tsp', 'чайная ложка': 'tsp',
  'шт': 'pcs', 'штука': 'pcs', 'штуки': 'pcs',
  'щепотка': 'pinch', 'щеп': 'pinch',
}
```

Отсутствие единицы → `pcs` если `quantity` целое, иначе `null` (фолбэк на `g`
для массовых продуктов оставляем сервису матчинга, чтобы парсер был чистым).

## 4. Алгоритм матчинга

```
function resolve(parsed): MatchResult {
  norm = normalize(parsed.name)

  // 1) точный
  alias = ProductAlias.findUnique({ normalizedText: norm, locale: 'ru' })
  if (alias) return { kind: 'exact', productId: alias.productId }

  // 2) trigram (pg_trgm), top-3
  candidates = SQL: SELECT product_id, similarity(normalized_text, $norm) AS s
               FROM product_aliases WHERE locale='ru'
               ORDER BY s DESC LIMIT 3
  best = candidates[0]
  if (best && best.score >= 0.65) return { kind: 'fuzzy', productId: best.product_id }
  if (best && best.score >= 0.45) return { kind: 'ambiguous', candidates }

  // 3) ничего
  return { kind: 'none', candidates: [] }
}
```

Пороги (`0.65` / `0.45`) вынесены в конфиг (`MATCH_STRONG`, `MATCH_WEAK`) —
чтобы потом тюнить без правок кода.

## 5. Поток `POST /recipes/:id/ingredients`

```
input: [ "2 ст.л. оливкового масла", { productId, quantity, unit }, ... ]

for each item:
  if item.productId:
    -> create RecipeIngredient напрямую
  else:
    parsed = parseIngredient(item.raw)
    match  = matching.resolve(parsed)
    switch match.kind:
      'exact' | 'fuzzy':
        -> create RecipeIngredient
      'ambiguous' | 'none':
        -> insert IngredientMatchQueue (с candidates)

return { created: [...], queued: [...] }
```

Эндпоинт всегда `200`. UI/оператор разруливает очередь.

## 6. Решение очереди

```
POST /matching/queue/:id/resolve
body: { productId, createAlias?: boolean, unitId?, quantity? }

action:
  if createAlias: ProductAlias.upsert({ normalizedText: queue.parsedName, productId })
  RecipeIngredient.create({ recipeId, productId, quantity, unitId, rawText })
  IngredientMatchQueue.delete(id)
```

## 7. Открытые вопросы (на следующие фазы)

- Локаль `en` и автоперевод алиасов.
- ML-эмбеддинги для матчинга (если trigram перестанет тянуть).
- Версионирование Product (rebrand, изменение КБЖУ).
- Привязка к торговым SKU (фаза «закупки»).
