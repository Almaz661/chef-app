# Tasks — Фаза 7: Минимальный фронтенд

## T1. Scaffold
- [x] `web/package.json` (next, react, tailwind, typescript)
- [x] `tsconfig.json` с path alias `@/*`
- [x] `tailwind.config.ts` + `postcss.config.js`
- [x] `next.config.js` с rewrites → backend
- [x] `.env.example`

## T2. Layout + Nav
- [x] `src/app/layout.tsx` — html shell, metadata, `<Nav />`
- [x] `src/app/globals.css` — tailwind directives + body base
- [x] `src/components/nav.tsx` — sticky header, 4 links, active state

## T3. API client
- [x] `src/lib/api.ts` — fetchJson helper + typed wrappers для:
  - recipes (groups, list, detail, nutrition)
  - cooking (cook)
  - inventory (list)
  - alerts (expiring, count)
  - history (list, stats)

## T4. Home page
- [x] 8 group buttons + UNGROUPED, grid responsive
- [x] Emoji + label + count badge
- [x] Graceful fallback при недоступном API

## T5. Recipes list
- [x] Filter by group (from query param)
- [x] Client-side search input
- [x] Cards: title, description (line-clamp-2), servings

## T6. Recipe detail
- [x] Ingredients table (product name, quantity, unit)
- [x] КБЖУ карточки (4 numbers: kcal, protein, fat, carbs)
- [x] PREP badge with yield/location/shelfLife info
- [x] Cook button placeholder with API instructions

## T7. Inventory
- [x] Grouped by location (Fridge / Freezer / Pantry)
- [x] Each item: product name, quantity, unit, expiresAt
- [x] Empty state

## T8. Alerts
- [x] Days selector (1/3/7/14)
- [x] Color-coded: red = expired, amber = soon
- [x] Product name, location, quantity, date

## T9. History
- [x] Stats summary (totalCooks, distinctRecipes, top-5)
- [x] Feed of cooking events (recipe link, servings, date, consumed)
- [x] Empty state

## T10. Spec + PR
- [x] `.kiro/specs/phase-7-frontend/{requirements,design,tasks}.md`
- [ ] Commit from `phase-7/frontend` branch
- [ ] Push + open PR #10

## DoD
- [ ] All files created, no TypeScript syntax errors in pages
- [ ] PR #10 opened targeting main
