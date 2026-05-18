/**
 * Phase 6.7 — homemade preparations (заготовки).
 *
 * These products differ from regular pantry items by the `isPrep: true`
 * flag: they are not bought in a store, they're produced by cooking a
 * PREP recipe (see prisma/data/recipes-prep.ts). The cook flow drops a
 * fresh batch into the inventory with location + expiresAt taken from
 * the recipe.
 *
 * KBJU values are reasonable approximations for the finished product —
 * not derived from ingredients. They can be updated later without any
 * migration.
 */
import type { SeedProduct } from './products-fresh';

const VG = ['vegetarian', 'gluten_free']; // most preps: vegetarian (contain dairy/eggs in some cases)
const VG_FREE = ['vegan', 'vegetarian', 'gluten_free', 'lactose_free'];
const MEAT = ['gluten_free', 'lactose_free'];

export const PREPS: SeedProduct[] = [
  {
    slug: 'prep-chicken-broth',
    name: 'Куриный бульон (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'ml',
    aliases: ['куриный бульон', 'бульон куриный', 'бульон из курицы'],
    kcalPer100: 32, proteinPer100: 4.3, fatPer100: 1.4, carbsPer100: 0.4,
    tags: MEAT,
    isPrep: true,
  },
  {
    slug: 'prep-beef-broth',
    name: 'Говяжий бульон (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'ml',
    aliases: ['говяжий бульон', 'бульон говяжий', 'бульон из говядины'],
    kcalPer100: 35, proteinPer100: 5.1, fatPer100: 1.6, carbsPer100: 0.2,
    tags: MEAT,
    isPrep: true,
  },
  {
    slug: 'prep-vegetable-broth',
    name: 'Овощной бульон (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'ml',
    aliases: ['овощной бульон', 'бульон овощной'],
    kcalPer100: 12, proteinPer100: 0.5, fatPer100: 0.1, carbsPer100: 2.5,
    tags: VG_FREE,
    isPrep: true,
  },
  {
    slug: 'prep-shortcrust-dough',
    name: 'Песочное тесто (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'g',
    aliases: ['песочное тесто', 'тесто песочное'],
    kcalPer100: 417, proteinPer100: 6.4, fatPer100: 21.6, carbsPer100: 50.5,
    tags: VG,
    isPrep: true,
  },
  {
    slug: 'prep-yeast-dough',
    name: 'Дрожжевое тесто (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'g',
    aliases: ['дрожжевое тесто', 'тесто дрожжевое'],
    kcalPer100: 234, proteinPer100: 6.8, fatPer100: 5.2, carbsPer100: 41.7,
    tags: VG,
    isPrep: true,
  },
  {
    slug: 'prep-pelmeni-mince',
    name: 'Фарш для пельменей (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'g',
    aliases: ['фарш пельменный', 'пельменный фарш', 'фарш для пельменей'],
    kcalPer100: 245, proteinPer100: 16.5, fatPer100: 19, carbsPer100: 1.2,
    tags: MEAT,
    isPrep: true,
  },
  {
    slug: 'prep-soffritto',
    name: 'Зажарка лук-морковь (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'g',
    aliases: ['зажарка', 'зажарка лук морковь', 'soffritto'],
    kcalPer100: 96, proteinPer100: 1.1, fatPer100: 7.6, carbsPer100: 7.2,
    tags: VG_FREE,
    isPrep: true,
  },
  {
    slug: 'prep-bolognese-sauce',
    name: 'Соус болоньезе (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'g',
    aliases: ['болоньезе', 'соус болоньезе', 'болоньезе соус'],
    kcalPer100: 145, proteinPer100: 9.5, fatPer100: 9.8, carbsPer100: 5.6,
    tags: MEAT,
    isPrep: true,
  },
  {
    slug: 'prep-tomato-sauce',
    name: 'Базовый томатный соус (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'g',
    aliases: ['томатный соус', 'базовый томатный соус', 'соус томатный'],
    kcalPer100: 55, proteinPer100: 1.4, fatPer100: 2.6, carbsPer100: 6.8,
    tags: VG_FREE,
    isPrep: true,
  },
  {
    slug: 'prep-berry-puree',
    name: 'Ягодное пюре (заготовка)',
    category: 'Заготовки',
    baseUnitId: 'g',
    aliases: ['ягодное пюре', 'пюре ягодное'],
    kcalPer100: 70, proteinPer100: 0.6, fatPer100: 0.3, carbsPer100: 17,
    tags: VG_FREE,
    isPrep: true,
  },
];
