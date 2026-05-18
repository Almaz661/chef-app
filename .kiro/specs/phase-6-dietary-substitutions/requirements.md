# Фаза 6 — Замены продуктов по диете

## 1. Цель

Дать пользователю ответы на два вопроса:
- «**Можно ли мне приготовить этот рецепт**, если я не ем мясо / молочное / глютен?»
- «**Чем заменить** продукт, который я не ем?»

Технически: на каждом продукте уже есть `tags` (Phase 1) — это маркеры
вроде `vegan`, `gluten_free`, `lactose_free`, `nut_free`. Phase 6 даёт
два инструмента поверх:

1. **Справочник замен** — таблица `ProductSubstitution`, где можно
   связать пары «вместо A можно использовать B». Связи направленные
   (с флагом `bidirectional`, по умолчанию `true`).
2. **Эндпоинт «проверь рецепт»** — пройдёт по всем ингредиентам,
   найдёт несовместимые с заданной диетой и предложит замены.

## 2. Глоссарий

| Термин | Значение |
| --- | --- |
| Diet tag | Строка вроде `vegan`, `gluten_free`, `lactose_free`, `nut_free`, `vegetarian`. Хранится в `Product.tags`. |
| Required tags | Список диетических тегов, которые **должны быть у продукта**, чтобы он считался совместимым. Например, `[vegan, gluten_free]`. |
| Substitution | Запись `ProductSubstitution(productId, substituteId, conversionRatio, bidirectional, note)`. Двунаправленность по умолчанию. |
| Compatible | Продукт, у которого все `requiredTags` присутствуют в `tags`. |

## 3. Функциональные требования

### Справочник замен

- **FR-6.1.** Можно создавать связи «продукт A → можно заменить на B»:
  - `POST /products/:id/substitutes` с `{ substituteId, conversionRatio?, bidirectional?, note? }`,
  - уникальность пары `(productId, substituteId)`,
  - `bidirectional=true` по умолчанию.
- **FR-6.2.** Можно удалять: `DELETE /products/:id/substitutes/:substituteId`.
- **FR-6.3.** `GET /products/:id/substitutes?tags=…` возвращает все замены
  для данного продукта с флагом `matches`, показывающим, подходит ли
  каждая замена под `requiredTags`. Без `tags` всё возвращается с
  `matches=true`.

### Анализ рецепта

- **FR-6.4.** `GET /recipes/:id/diet-check?tags=vegan` принимает как
  минимум один тег. Возвращает: рецепт, список несовместимых
  ингредиентов и для каждого — предложенные замены (только подходящие).

### Удаление продукта

- **FR-6.5.** `Product.delete` каскадно удаляет все его связи в
  `ProductSubstitution` (через `onDelete: Cascade`).

## 4. Нефункциональные

- **NFR-6.1.** Чистые проверки тегов вынесены в `diet-tags.ts` (без БД).
- **NFR-6.2.** Запросы — через Prisma includes, никакого N+1.

## 5. Out of scope

- Автоматический пересчёт количеств с `conversionRatio` (поле
  сохраняется на будущее).
- Профиль пользователя и аллергии.
- Frontend.

## 6. Критерии приёмки

- [ ] Миграция `20260518233000_substitutions` поднимает таблицу.
- [ ] `POST /products/A/substitutes { substituteId: B }` создаёт связь;
      повторная попытка с тем же `(A,B)` → 409.
- [ ] `GET /products/A/substitutes` возвращает B; при `bidirectional=true`
      `GET /products/B/substitutes` тоже возвращает A.
- [ ] `GET /products/A/substitutes?tags=vegan` помечает каждый
      результат `matches: true|false`.
- [ ] `DELETE /products/A/substitutes/B` удаляет связь.
- [ ] Удаление `Product` каскадно убирает связанные замены.
- [ ] `GET /recipes/:id/diet-check?tags=vegan` для seed-рецепта
      «Простой томатный салат» возвращает `ok: true`.
- [ ] Юнит-тесты `tagsAreCompatible` зелёные.
- [ ] Регрессия: все 61 предыдущих теста по-прежнему зелёные.
