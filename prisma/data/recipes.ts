/**
 * Demo recipes — cover a variety of cuisines and let the user play with
 * shopping-list, cook, nutrition and diet-check endpoints right after seed.
 *
 * Each ingredient references a product by slug (must exist in seed) and
 * the unit must be either the product's base unit or a unit that has a
 * conversion to it (global or product-specific).
 *
 * `group` corresponds to the navigation buttons on the frontend
 * (Завтраки / Супы / Основные блюда / Салаты / Выпечка / Десерты / Напитки).
 */
export type RecipeGroupLiteral =
  | 'BREAKFAST'
  | 'SOUP'
  | 'MAIN'
  | 'SALAD'
  | 'BAKING'
  | 'DESSERT'
  | 'DRINK';

export interface SeedRecipe {
  slug: string;
  title: string;
  description: string;
  servings: number;
  group: RecipeGroupLiteral;
  ingredients: Array<{
    productSlug: string;
    quantity: number;
    unitId: 'g' | 'kg' | 'ml' | 'l' | 'tbsp' | 'tsp' | 'pcs' | 'pinch';
    rawText: string;
  }>;
}

export const RECIPES: SeedRecipe[] = [
  // ---------- САЛАТЫ ----------
  {
    slug: 'simple-tomato-salad',
    title: 'Простой томатный салат',
    description: 'Минималистичный салат: помидоры, оливковое масло, соль.',
    servings: 2,
    group: 'SALAD',
    ingredients: [
      { productSlug: 'tomato', quantity: 300, unitId: 'g', rawText: '300 г помидоров' },
      { productSlug: 'olive-oil', quantity: 2, unitId: 'tbsp', rawText: '2 ст.л. оливкового масла' },
      { productSlug: 'salt', quantity: 1, unitId: 'pinch', rawText: 'щепотка соли' },
    ],
  },
  {
    slug: 'greek-salad',
    title: 'Греческий салат',
    description: 'Лёгкий салат с моцареллой и оливками.',
    servings: 2,
    group: 'SALAD',
    ingredients: [
      { productSlug: 'tomato', quantity: 300, unitId: 'g', rawText: '300 г помидоров' },
      { productSlug: 'cucumber', quantity: 200, unitId: 'g', rawText: '200 г огурцов' },
      { productSlug: 'bell-pepper', quantity: 150, unitId: 'g', rawText: '1 болгарский перец' },
      { productSlug: 'onion-yellow', quantity: 80, unitId: 'g', rawText: '1 небольшая луковица' },
      { productSlug: 'olives', quantity: 80, unitId: 'g', rawText: '80 г оливок' },
      { productSlug: 'cheese-mozzarella', quantity: 150, unitId: 'g', rawText: '150 г моцареллы' },
      { productSlug: 'olive-oil', quantity: 3, unitId: 'tbsp', rawText: '3 ст.л. оливкового масла' },
      { productSlug: 'oregano', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. орегано' },
      { productSlug: 'salt', quantity: 1, unitId: 'pinch', rawText: 'соль по вкусу' },
    ],
  },
  {
    slug: 'cucumber-tomato-salad',
    title: 'Огурцы с помидорами и зеленью',
    description: 'Летний салат на каждый день, готовится за 5 минут.',
    servings: 2,
    group: 'SALAD',
    ingredients: [
      { productSlug: 'cucumber', quantity: 250, unitId: 'g', rawText: '250 г огурцов' },
      { productSlug: 'tomato', quantity: 250, unitId: 'g', rawText: '250 г помидоров' },
      { productSlug: 'onion-green', quantity: 30, unitId: 'g', rawText: 'пучок зелёного лука' },
      { productSlug: 'dill-fresh', quantity: 10, unitId: 'g', rawText: 'пучок укропа' },
      { productSlug: 'sour-cream', quantity: 2, unitId: 'tbsp', rawText: '2 ст.л. сметаны' },
      { productSlug: 'salt', quantity: 1, unitId: 'pinch', rawText: 'соль по вкусу' },
    ],
  },

  // ---------- СУПЫ ----------
  {
    slug: 'borsch',
    title: 'Борщ',
    description: 'Классический украинский борщ на 4 порции.',
    servings: 4,
    group: 'SOUP',
    ingredients: [
      { productSlug: 'beef', quantity: 400, unitId: 'g', rawText: '400 г говядины' },
      { productSlug: 'beetroot', quantity: 300, unitId: 'g', rawText: '300 г свёклы' },
      { productSlug: 'cabbage-white', quantity: 300, unitId: 'g', rawText: '300 г капусты' },
      { productSlug: 'potato', quantity: 400, unitId: 'g', rawText: '400 г картофеля' },
      { productSlug: 'carrot', quantity: 150, unitId: 'g', rawText: '150 г моркови' },
      { productSlug: 'onion-yellow', quantity: 150, unitId: 'g', rawText: '1 крупная луковица' },
      { productSlug: 'tomato-paste', quantity: 2, unitId: 'tbsp', rawText: '2 ст.л. томатной пасты' },
      { productSlug: 'sunflower-oil', quantity: 3, unitId: 'tbsp', rawText: '3 ст.л. подсолнечного масла' },
      { productSlug: 'garlic', quantity: 10, unitId: 'g', rawText: '2 зубчика чеснока' },
      { productSlug: 'bay-leaf', quantity: 2, unitId: 'pcs', rawText: '2 лавровых листа' },
      { productSlug: 'salt', quantity: 2, unitId: 'tsp', rawText: '2 ч.л. соли' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. чёрного перца' },
    ],
  },
  {
    slug: 'chicken-noodle-soup',
    title: 'Куриный суп с лапшой',
    description: 'Простой домашний суп на курином бульоне с макаронами.',
    servings: 4,
    group: 'SOUP',
    ingredients: [
      { productSlug: 'chicken-thigh', quantity: 500, unitId: 'g', rawText: '500 г куриных бёдер' },
      { productSlug: 'pasta', quantity: 100, unitId: 'g', rawText: '100 г макарон' },
      { productSlug: 'potato', quantity: 300, unitId: 'g', rawText: '300 г картофеля' },
      { productSlug: 'carrot', quantity: 100, unitId: 'g', rawText: '1 морковь' },
      { productSlug: 'onion-yellow', quantity: 100, unitId: 'g', rawText: '1 луковица' },
      { productSlug: 'parsley-fresh', quantity: 10, unitId: 'g', rawText: 'пучок петрушки' },
      { productSlug: 'bay-leaf', quantity: 1, unitId: 'pcs', rawText: '1 лавровый лист' },
      { productSlug: 'salt', quantity: 2, unitId: 'tsp', rawText: '2 ч.л. соли' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'pinch', rawText: 'щепотка перца' },
    ],
  },
  {
    slug: 'lentil-soup',
    title: 'Чечевичный суп',
    description: 'Постный густой суп из красной чечевицы с морковью.',
    servings: 4,
    group: 'SOUP',
    ingredients: [
      { productSlug: 'lentils', quantity: 250, unitId: 'g', rawText: '250 г чечевицы' },
      { productSlug: 'carrot', quantity: 150, unitId: 'g', rawText: '1 крупная морковь' },
      { productSlug: 'onion-yellow', quantity: 100, unitId: 'g', rawText: '1 луковица' },
      { productSlug: 'garlic', quantity: 5, unitId: 'g', rawText: '1 зубчик чеснока' },
      { productSlug: 'olive-oil', quantity: 2, unitId: 'tbsp', rawText: '2 ст.л. оливкового масла' },
      { productSlug: 'cumin', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. зиры' },
      { productSlug: 'salt', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. соли' },
    ],
  },

  // ---------- ОСНОВНЫЕ БЛЮДА ----------
  {
    slug: 'pasta-carbonara',
    title: 'Паста карбонара',
    description: 'Итальянская классика на скорую руку.',
    servings: 2,
    group: 'MAIN',
    ingredients: [
      { productSlug: 'pasta', quantity: 200, unitId: 'g', rawText: '200 г макарон' },
      { productSlug: 'bacon', quantity: 100, unitId: 'g', rawText: '100 г бекона' },
      { productSlug: 'egg-chicken', quantity: 2, unitId: 'pcs', rawText: '2 яйца' },
      { productSlug: 'cheese-hard', quantity: 50, unitId: 'g', rawText: '50 г твёрдого сыра' },
      { productSlug: 'garlic', quantity: 5, unitId: 'g', rawText: '1 зубчик чеснока' },
      { productSlug: 'olive-oil', quantity: 1, unitId: 'tbsp', rawText: '1 ст.л. оливкового масла' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'pinch', rawText: 'щепотка чёрного перца' },
      { productSlug: 'salt', quantity: 1, unitId: 'pinch', rawText: 'соль по вкусу' },
    ],
  },
  {
    slug: 'baked-chicken-potatoes',
    title: 'Запечённая курица с картофелем',
    description: 'Курица и картошка в одном противне — минимум усилий, максимум вкуса.',
    servings: 4,
    group: 'MAIN',
    ingredients: [
      { productSlug: 'chicken-thigh', quantity: 800, unitId: 'g', rawText: '800 г куриных бёдер' },
      { productSlug: 'potato', quantity: 800, unitId: 'g', rawText: '800 г картофеля' },
      { productSlug: 'onion-yellow', quantity: 150, unitId: 'g', rawText: '1 крупная луковица' },
      { productSlug: 'garlic', quantity: 15, unitId: 'g', rawText: '3 зубчика чеснока' },
      { productSlug: 'sunflower-oil', quantity: 3, unitId: 'tbsp', rawText: '3 ст.л. растительного масла' },
      { productSlug: 'paprika', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. паприки' },
      { productSlug: 'thyme', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. тимьяна' },
      { productSlug: 'salt', quantity: 2, unitId: 'tsp', rawText: '2 ч.л. соли' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. чёрного перца' },
    ],
  },
  {
    slug: 'vegetable-stew',
    title: 'Овощное рагу',
    description: 'Лёгкое рагу из сезонных овощей.',
    servings: 4,
    group: 'MAIN',
    ingredients: [
      { productSlug: 'zucchini', quantity: 400, unitId: 'g', rawText: '400 г кабачков' },
      { productSlug: 'eggplant', quantity: 300, unitId: 'g', rawText: '300 г баклажанов' },
      { productSlug: 'bell-pepper', quantity: 200, unitId: 'g', rawText: '2 болгарских перца' },
      { productSlug: 'tomato', quantity: 300, unitId: 'g', rawText: '300 г помидоров' },
      { productSlug: 'onion-yellow', quantity: 150, unitId: 'g', rawText: '1 луковица' },
      { productSlug: 'garlic', quantity: 10, unitId: 'g', rawText: '2 зубчика чеснока' },
      { productSlug: 'olive-oil', quantity: 3, unitId: 'tbsp', rawText: '3 ст.л. оливкового масла' },
      { productSlug: 'basil', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. базилика' },
      { productSlug: 'salt', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. соли' },
    ],
  },
  {
    slug: 'salmon-pan',
    title: 'Лосось на сковороде',
    description: 'Стейк лосося с лимоном — 15 минут до подачи.',
    servings: 2,
    group: 'MAIN',
    ingredients: [
      { productSlug: 'salmon', quantity: 400, unitId: 'g', rawText: '400 г лосося (2 стейка)' },
      { productSlug: 'lemon', quantity: 60, unitId: 'g', rawText: '0.5 лимона' },
      { productSlug: 'olive-oil', quantity: 2, unitId: 'tbsp', rawText: '2 ст.л. оливкового масла' },
      { productSlug: 'garlic', quantity: 5, unitId: 'g', rawText: '1 зубчик чеснока' },
      { productSlug: 'thyme', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. тимьяна' },
      { productSlug: 'salt', quantity: 1, unitId: 'pinch', rawText: 'соль по вкусу' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'pinch', rawText: 'перец по вкусу' },
    ],
  },

  // ---------- ЗАВТРАКИ ----------
  {
    slug: 'oatmeal-banana',
    title: 'Овсянка с бананом',
    description: 'Быстрый завтрак: овсянка на молоке с бананом и мёдом.',
    servings: 1,
    group: 'BREAKFAST',
    ingredients: [
      { productSlug: 'oats', quantity: 50, unitId: 'g', rawText: '50 г овсяных хлопьев' },
      { productSlug: 'milk', quantity: 250, unitId: 'ml', rawText: '250 мл молока' },
      { productSlug: 'banana', quantity: 120, unitId: 'g', rawText: '1 банан' },
      { productSlug: 'honey', quantity: 1, unitId: 'tbsp', rawText: '1 ст.л. мёда' },
      { productSlug: 'cinnamon', quantity: 1, unitId: 'pinch', rawText: 'щепотка корицы' },
    ],
  },
  {
    slug: 'syrniki',
    title: 'Сырники',
    description: 'Творожные сырники со сметаной — классический завтрак.',
    servings: 2,
    group: 'BREAKFAST',
    ingredients: [
      { productSlug: 'cottage-cheese', quantity: 400, unitId: 'g', rawText: '400 г творога' },
      { productSlug: 'egg-chicken', quantity: 1, unitId: 'pcs', rawText: '1 яйцо' },
      { productSlug: 'flour-wheat', quantity: 3, unitId: 'tbsp', rawText: '3 ст.л. муки' },
      { productSlug: 'sugar-white', quantity: 2, unitId: 'tbsp', rawText: '2 ст.л. сахара' },
      { productSlug: 'sunflower-oil', quantity: 2, unitId: 'tbsp', rawText: '2 ст.л. растительного масла' },
      { productSlug: 'sour-cream', quantity: 100, unitId: 'g', rawText: '100 г сметаны для подачи' },
      { productSlug: 'salt', quantity: 1, unitId: 'pinch', rawText: 'щепотка соли' },
    ],
  },
  {
    slug: 'scrambled-eggs',
    title: 'Яичница с помидорами',
    description: 'Простой быстрый завтрак на одного.',
    servings: 1,
    group: 'BREAKFAST',
    ingredients: [
      { productSlug: 'egg-chicken', quantity: 2, unitId: 'pcs', rawText: '2 яйца' },
      { productSlug: 'tomato', quantity: 100, unitId: 'g', rawText: '1 помидор' },
      { productSlug: 'butter', quantity: 1, unitId: 'tbsp', rawText: '1 ст.л. сливочного масла' },
      { productSlug: 'salt', quantity: 1, unitId: 'pinch', rawText: 'соль по вкусу' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'pinch', rawText: 'перец по вкусу' },
    ],
  },

  // ---------- ВЫПЕЧКА ----------
  {
    slug: 'apple-charlotte',
    title: 'Шарлотка с яблоками',
    description: 'Бабушкина шарлотка — простая и всегда удачная.',
    servings: 6,
    group: 'BAKING',
    ingredients: [
      { productSlug: 'apple', quantity: 500, unitId: 'g', rawText: '500 г яблок (3-4 шт)' },
      { productSlug: 'flour-wheat', quantity: 200, unitId: 'g', rawText: '200 г муки' },
      { productSlug: 'sugar-white', quantity: 200, unitId: 'g', rawText: '200 г сахара' },
      { productSlug: 'egg-chicken', quantity: 4, unitId: 'pcs', rawText: '4 яйца' },
      { productSlug: 'butter', quantity: 30, unitId: 'g', rawText: '30 г сливочного масла для формы' },
      { productSlug: 'cinnamon', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. корицы' },
      { productSlug: 'baking-powder', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. разрыхлителя' },
    ],
  },
  {
    slug: 'cottage-cheese-casserole',
    title: 'Творожная запеканка',
    description: 'Нежная запеканка из творога с изюмом.',
    servings: 4,
    group: 'BAKING',
    ingredients: [
      { productSlug: 'cottage-cheese', quantity: 500, unitId: 'g', rawText: '500 г творога' },
      { productSlug: 'egg-chicken', quantity: 3, unitId: 'pcs', rawText: '3 яйца' },
      { productSlug: 'sugar-white', quantity: 100, unitId: 'g', rawText: '100 г сахара' },
      { productSlug: 'semolina', quantity: 3, unitId: 'tbsp', rawText: '3 ст.л. манки' },
      { productSlug: 'sour-cream', quantity: 100, unitId: 'g', rawText: '100 г сметаны' },
      { productSlug: 'raisins', quantity: 50, unitId: 'g', rawText: '50 г изюма' },
      { productSlug: 'butter', quantity: 20, unitId: 'g', rawText: '20 г сливочного масла для формы' },
      { productSlug: 'vanilla-sugar', quantity: 10, unitId: 'g', rawText: '10 г ванильного сахара' },
    ],
  },

  // ---------- ДЕСЕРТЫ ----------
  {
    slug: 'chocolate-mousse',
    title: 'Шоколадный мусс',
    description: 'Лёгкий мусс из тёмного шоколада на 4 порции.',
    servings: 4,
    group: 'DESSERT',
    ingredients: [
      { productSlug: 'chocolate-dark', quantity: 200, unitId: 'g', rawText: '200 г тёмного шоколада' },
      { productSlug: 'cream-33', quantity: 300, unitId: 'ml', rawText: '300 мл сливок 33%' },
      { productSlug: 'sugar-white', quantity: 50, unitId: 'g', rawText: '50 г сахара' },
      { productSlug: 'egg-chicken', quantity: 2, unitId: 'pcs', rawText: '2 яйца' },
      { productSlug: 'butter', quantity: 30, unitId: 'g', rawText: '30 г сливочного масла' },
    ],
  },
  {
    slug: 'fruit-salad',
    title: 'Фруктовый салат с йогуртом',
    description: 'Свежий десерт без сахара и выпечки.',
    servings: 2,
    group: 'DESSERT',
    ingredients: [
      { productSlug: 'apple', quantity: 150, unitId: 'g', rawText: '1 яблоко' },
      { productSlug: 'banana', quantity: 120, unitId: 'g', rawText: '1 банан' },
      { productSlug: 'orange', quantity: 200, unitId: 'g', rawText: '1 апельсин' },
      { productSlug: 'strawberry', quantity: 100, unitId: 'g', rawText: '100 г клубники' },
      { productSlug: 'yogurt-natural', quantity: 200, unitId: 'g', rawText: '200 г натурального йогурта' },
      { productSlug: 'honey', quantity: 1, unitId: 'tbsp', rawText: '1 ст.л. мёда' },
    ],
  },

  // ---------- НАПИТКИ ----------
  {
    slug: 'banana-smoothie',
    title: 'Банановый смузи',
    description: 'Молочный смузи на завтрак или перекус.',
    servings: 2,
    group: 'DRINK',
    ingredients: [
      { productSlug: 'banana', quantity: 240, unitId: 'g', rawText: '2 банана' },
      { productSlug: 'milk', quantity: 400, unitId: 'ml', rawText: '400 мл молока' },
      { productSlug: 'oats', quantity: 30, unitId: 'g', rawText: '30 г овсяных хлопьев' },
      { productSlug: 'honey', quantity: 1, unitId: 'tbsp', rawText: '1 ст.л. мёда' },
      { productSlug: 'cinnamon', quantity: 1, unitId: 'pinch', rawText: 'щепотка корицы' },
    ],
  },
  {
    slug: 'lemonade',
    title: 'Домашний лимонад',
    description: 'Освежающий лимонад с мятой.',
    servings: 4,
    group: 'DRINK',
    ingredients: [
      { productSlug: 'lemon', quantity: 240, unitId: 'g', rawText: '2 крупных лимона' },
      { productSlug: 'sugar-white', quantity: 100, unitId: 'g', rawText: '100 г сахара' },
      { productSlug: 'mint-fresh', quantity: 10, unitId: 'g', rawText: 'пучок мяты' },
      { productSlug: 'ginger-root', quantity: 20, unitId: 'g', rawText: '20 г имбиря' },
    ],
  },
];
