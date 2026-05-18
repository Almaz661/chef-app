/**
 * Demo recipes — cover a variety of cuisines and let the user play with
 * shopping-list, cook, nutrition and diet-check endpoints right after seed.
 *
 * Each ingredient references a product by slug (must exist in seed) and
 * the unit must be either the product's base unit or a unit that has a
 * conversion to it (global or product-specific).
 */
export interface SeedRecipe {
  slug: string;
  title: string;
  description: string;
  servings: number;
  ingredients: Array<{
    productSlug: string;
    quantity: number;
    unitId: 'g' | 'kg' | 'ml' | 'l' | 'tbsp' | 'tsp' | 'pcs' | 'pinch';
    rawText: string;
  }>;
}

export const RECIPES: SeedRecipe[] = [
  {
    slug: 'simple-tomato-salad',
    title: 'Простой томатный салат',
    description: 'Минималистичный салат: помидоры, оливковое масло, соль.',
    servings: 2,
    ingredients: [
      { productSlug: 'tomato', quantity: 300, unitId: 'g', rawText: '300 г помидоров' },
      { productSlug: 'olive-oil', quantity: 2, unitId: 'tbsp', rawText: '2 ст.л. оливкового масла' },
      { productSlug: 'salt', quantity: 1, unitId: 'pinch', rawText: 'щепотка соли' },
    ],
  },
  {
    slug: 'pasta-carbonara',
    title: 'Паста карбонара',
    description: 'Итальянская классика на скорую руку.',
    servings: 2,
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
    slug: 'borsch',
    title: 'Борщ',
    description: 'Классический украинский борщ на 4 порции.',
    servings: 4,
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
    slug: 'oatmeal-banana',
    title: 'Овсянка с бананом',
    description: 'Быстрый завтрак: овсянка на молоке с бананом и мёдом.',
    servings: 1,
    ingredients: [
      { productSlug: 'oats', quantity: 50, unitId: 'g', rawText: '50 г овсяных хлопьев' },
      { productSlug: 'milk', quantity: 250, unitId: 'ml', rawText: '250 мл молока' },
      { productSlug: 'banana', quantity: 120, unitId: 'g', rawText: '1 банан' },
      { productSlug: 'honey', quantity: 1, unitId: 'tbsp', rawText: '1 ст.л. мёда' },
      { productSlug: 'cinnamon', quantity: 1, unitId: 'pinch', rawText: 'щепотка корицы' },
    ],
  },
  {
    slug: 'greek-salad',
    title: 'Греческий салат',
    description: 'Лёгкий салат с фетой/моцареллой и оливками.',
    servings: 2,
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
];
