# Design — Фаза 7: Минимальный фронтенд

## 1. Стек

| Слой | Технология | Версия |
|------|------------|--------|
| Framework | Next.js (App Router) | 14.2+ |
| UI | React | 18.3 |
| Стили | Tailwind CSS | 3.4 |
| Типы | TypeScript | 5.3 |
| HTTP | fetch (browser native) | — |

Никаких дополнительных библиотек (zustand, react-query, axios) —
минимализм. Если данных станет больше, добавим SWR/react-query в
следующей фазе.

## 2. Файловая структура

```
web/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js          # rewrites /api/* → backend
├── .env.example
├── public/
└── src/
    ├── app/
    │   ├── layout.tsx       # Shell: Nav + main
    │   ├── globals.css      # Tailwind directives
    │   ├── page.tsx         # Home: 8 group buttons
    │   ├── recipes/
    │   │   ├── page.tsx     # List by group + search
    │   │   └── [id]/
    │   │       └── page.tsx # Detail: ingredients + KBJU
    │   ├── inventory/
    │   │   └── page.tsx     # Grouped by location
    │   ├── alerts/
    │   │   └── page.tsx     # Expiring items
    │   └── history/
    │       └── page.tsx     # Cooking feed + stats
    ├── components/
    │   └── nav.tsx          # Top navigation bar
    └── lib/
        └── api.ts           # Typed fetch wrappers
```

## 3. API proxy

`next.config.js` проксирует `/api/*` на `NEXT_PUBLIC_API_URL`
(default `http://localhost:3000`). Это убирает CORS и позволяет
деплоить фронт и бэк на разных портах/хостах.

## 4. Страницы

### 4.1. Home (`/`)

Server component (SSR при доступном API, fallback при ошибке).
Вызывает `GET /recipes/groups` → рисует grid из 8 + UNGROUPED
кнопок с emoji, названием и счётчиком.

### 4.2. Recipes list (`/recipes?group=X`)

Client component. `useSearchParams` для group, `useState` для
поискового запроса. Debounce не нужен (список <30 элементов).
Вызывает `GET /recipes?group=...&search=...`.

### 4.3. Recipe detail (`/recipes/[id]`)

Client component. Параллельно запрашивает `GET /recipes/:id` и
`GET /recipes/:id/nutrition`. Показывает ингредиенты, КБЖУ-карточки,
badge для PREP-рецептов. Кнопка «Приготовить» — заглушка с
инструкцией через API (полный cook-flow — out of scope).

### 4.4. Inventory (`/inventory`)

Client component. `GET /inventory` → группировка на клиенте по
`location`. Три секции: Холодильник / Морозилка / Кладовка.

### 4.5. Alerts (`/alerts`)

Client component. `GET /alerts/expiring?days=N`. Dropdown для
выбора горизонта (1/3/7/14 дней). Цветовая индикация: красный =
просрочено, жёлтый = скоро.

### 4.6. History (`/history`)

Client component. Параллельно: `GET /cooking/history?limit=20` +
`GET /cooking/stats?days=30`. Сводка вверху (totalCooks,
distinctRecipes, top-5). Лента карточек с линком на рецепт.

## 5. Навигация

Компонент `<Nav />` — sticky header. Четыре ссылки: Рецепты,
Инвентарь, Сроки, История. Active state по `usePathname()`.
Логотип «🍳 ШефДом» ведёт на `/`.

## 6. API client (`lib/api.ts`)

Единая `fetchJson<T>(path, init?)` → typed response. Все эндпоинты
обёрнуты в named exports. Типы описаны интерфейсами прямо в файле
(без codegen, пока API стабилен). При ошибке — бросает `Error` с
телом ответа.

## 7. Error handling

- Все pages оборачивают fetch в try/catch.
- При ошибке показывается graceful пустое состояние, не белый экран.
- Home page — server component, при ошибке рендерит кнопки с count=0.

## 8. Стилевая система

- Tailwind utility-first.
- Цвета: `primary = #2563eb` (blue-600), `accent = #f59e0b` (amber-500).
- Карточки: `bg-white rounded-lg border border-gray-100 shadow-sm`.
- Mobile-first: grid 2 cols → 3 → 4 на desktop.
- Никаких кастомных компонентов-обёрток (Button, Card) — inline Tailwind.

## 9. Деплой (будущее)

Пока — только `npm run dev` локально. Когда понадобится:
- Vercel для фронта (zero-config для Next.js).
- Railway / Render для бэка + PostgreSQL.
- `NEXT_PUBLIC_API_URL` переключается на production URL.
