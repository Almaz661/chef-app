# Дизайн — Фаза 6.6

## 1. Schema

```prisma
enum RecipeGroup {
  BREAKFAST
  SOUP
  MAIN
  SALAD
  BAKING
  DESSERT
  DRINK
}

model Recipe {
  // ...existing fields
  group       RecipeGroup?
  @@index([group])
}
```

`Recipe.group` — опциональный, `?`. Это сознательно, чтобы:

1. Существующие рецепты без миграции данных остались валидными.
2. Новые рецепты от пользователя могут быть «без группы» до того,
   как он её выберет.

Миграция `20260519000000_recipe_groups` просто `CREATE TYPE` +
`ADD COLUMN` + `CREATE INDEX`. Никакого UPDATE для существующих
строк — наполнение делает обновлённый seed.

## 2. API

### `GET /recipes?group=...&search=...`

Реализация в `RecipesService.list`:

```ts
const where: Prisma.RecipeWhereInput = {};
if (filter.group) where.group = filter.group as RecipeGroup;
const search = filter.search?.trim();
if (search) {
  where.OR = [
    { title:       { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
  ];
}
return prisma.recipe.findMany({
  where,
  orderBy: { title: 'asc' },
  select: { id, slug, title, description, servings, group, updatedAt },
});
```

Постгрес выполнит `ILIKE %search%` — для текущего объёма (десятки—сотни
рецептов) этого достаточно. Если справочник вырастет в тысячи, поверх
этого можно будет натянуть `pg_trgm`, как в `ProductAlias` (Phase 1).

### `GET /recipes/groups`

```ts
const rows = await prisma.recipe.groupBy({
  by: ['group'],
  _count: { _all: true },
});
```

Затем смапить в фиксированный порядок 7 групп + `UNGROUPED`. Никаких
рекордов в БД для пустых групп не нужно — они дорисовываются на
сервисном слое.

## 3. DTO

`ListRecipesDto` — отдельный класс, `class-validator` пропустит через
`@Query()` пайп. Не объединяю с `CreateRecipeDto`, чтобы свойства
(`title`, `slug` и пр.) не путались с фильтрами.

## 4. Тесты

`test/catalog-integrity.spec.ts` дополняется тремя кейсами:

1. У каждого рецепта в seed валидная группа из перечня.
2. Каждая из 7 групп имеет минимум 1 рецепт (в фактическом seed —
   2-4, проверяем именно «не пусто», чтобы пустые кнопки на фронте
   были невозможны).

DB-уровневые тесты `list({group, search})` сделаем при появлении
интеграционного раннера; в Phase 6.6 ограничиваемся data-integrity.
