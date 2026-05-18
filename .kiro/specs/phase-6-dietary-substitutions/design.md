# Дизайн — Фаза 6

## 1. Схема (только одна новая таблица)

```prisma
model ProductSubstitution {
  id              String  @id @default(cuid())
  productId       String
  substituteId    String
  product         Product @relation("SubstitutionFrom", fields: [productId],    references: [id], onDelete: Cascade)
  substitute      Product @relation("SubstitutionTo",   fields: [substituteId], references: [id], onDelete: Cascade)
  conversionRatio Decimal @default(1) @db.Decimal(18, 6)
  bidirectional   Boolean @default(true)
  note            String?
  createdAt       DateTime @default(now())

  @@unique([productId, substituteId])
  @@index([productId])
  @@index([substituteId])
  @@map("product_substitutions")
}
```

К `Product` добавляются обратные связи:
```prisma
substitutionsFrom ProductSubstitution[] @relation("SubstitutionFrom")
substitutionsTo   ProductSubstitution[] @relation("SubstitutionTo")
```

## 2. Чистые функции (`src/diet/diet-tags.ts`)

```ts
export function tagsAreCompatible(
  productTags: readonly string[],
  requiredTags: readonly string[],
): boolean {
  if (requiredTags.length === 0) return true;
  const set = new Set(productTags);
  return requiredTags.every((t) => set.has(t));
}

export function findIncompatibleIngredients<T extends { tags: readonly string[] }>(
  ingredients: readonly T[],
  requiredTags: readonly string[],
): T[] {
  return ingredients.filter((i) => !tagsAreCompatible(i.tags, requiredTags));
}
```

## 3. `DietService`

```ts
listSubstitutes(productId, requiredTags?): Promise<{
  product: { id, slug, name, tags },
  required: string[],
  substitutes: Array<{
    productId, slug, name, tags,
    matches: boolean,
    conversionRatio: number,
    note: string | null,
  }>
}>
```

Алгоритм:
1. Загружаем `productSubstitution` где `productId == X`.
2. Дополнительно — где `substituteId == X AND bidirectional = true`.
3. Собираем список «других» продуктов с их тегами.
4. `matches = tagsAreCompatible(otherTags, required)`.

```ts
analyzeRecipe(recipeId, requiredTags): Promise<{
  recipe: { id, title },
  required: string[],
  ok: boolean,
  incompatible: Array<{
    productId, productName, productTags,
    suggestions: Array<{ productId, name, tags, conversionRatio }>
  }>
}>
```

Алгоритм:
1. Recipe.findUnique include ingredients.product.
2. Для каждого ингредиента — `tagsAreCompatible`.
3. Для несовместимых — `listSubstitutes` и фильтр по `matches=true`.

## 4. CRUD замен

`POST /products/:id/substitutes`, `DELETE /products/:id/substitutes/:substituteId`,
`GET /products/:id/substitutes?tags=`.

## 5. Тесты

`test/diet-tags.spec.ts`: 6 кейсов.
Регрессия: 61 + 6 = 67.
