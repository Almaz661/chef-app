/**
 * Phase 6.7 — 10 PREP recipes that produce homemade semi-finished
 * products from `products-prep.ts`. After cooking such a recipe, the
 * `cook` endpoint drops a fresh batch of `producesProductSlug` into the
 * inventory at `prepDefaultLocation`, expiring after
 * `prepShelfLifeDays` days.
 *
 * Standard shelf-life buckets (matched here):
 *   - meat / fish / broths / mince:  90 days (FREEZER)
 *   - raw dough:                     30 days (FREEZER or FRIDGE)
 *   - vegetable bases / sauces:     180 days (FREEZER)
 *
 * `servings` is set to 1 — the user scales output by changing
 * `MenuRecipe.servings` (cook 2x = double the yield).
 */
import type { SeedRecipe } from './recipes';

export const PREP_RECIPES: SeedRecipe[] = [
  // ---------- Бульоны (90 дней, FREEZER) ----------
  {
    slug: 'recipe-prep-chicken-broth',
    title: 'Заготовка: куриный бульон',
    description:
      'Прозрачный куриный бульон на 1.5 литра. Варится 1.5 часа из бёдер с овощами, ' +
      'процеживается и разливается на хранение.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-chicken-broth',
    prepYieldQuantity: 1500,
    prepYieldUnitId: 'ml',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 90,
    ingredients: [
      { productSlug: 'chicken-thigh', quantity: 600, unitId: 'g', rawText: '600 г куриных бёдер' },
      { productSlug: 'carrot', quantity: 100, unitId: 'g', rawText: '1 морковь' },
      { productSlug: 'onion-yellow', quantity: 100, unitId: 'g', rawText: '1 луковица' },
      { productSlug: 'celery-stalk', quantity: 50, unitId: 'g', rawText: '1 стебель сельдерея' },
      { productSlug: 'bay-leaf', quantity: 2, unitId: 'pcs', rawText: '2 лавровых листа' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. чёрного перца горошком' },
      { productSlug: 'salt', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. соли' },
    ],
  },
  {
    slug: 'recipe-prep-beef-broth',
    title: 'Заготовка: говяжий бульон',
    description:
      'Насыщенный говяжий бульон на 1.5 л. Варится 3 часа на медленном огне с кореньями.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-beef-broth',
    prepYieldQuantity: 1500,
    prepYieldUnitId: 'ml',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 90,
    ingredients: [
      { productSlug: 'beef', quantity: 800, unitId: 'g', rawText: '800 г говядины на кости' },
      { productSlug: 'carrot', quantity: 150, unitId: 'g', rawText: '1 крупная морковь' },
      { productSlug: 'onion-yellow', quantity: 150, unitId: 'g', rawText: '1 крупная луковица' },
      { productSlug: 'celery-stalk', quantity: 80, unitId: 'g', rawText: '2 стебля сельдерея' },
      { productSlug: 'bay-leaf', quantity: 2, unitId: 'pcs', rawText: '2 лавровых листа' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. перца горошком' },
      { productSlug: 'salt', quantity: 2, unitId: 'tsp', rawText: '2 ч.л. соли' },
    ],
  },
  {
    slug: 'recipe-prep-vegetable-broth',
    title: 'Заготовка: овощной бульон',
    description:
      'Лёгкий овощной бульон на 1.5 л — основа для постных супов и ризотто.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-vegetable-broth',
    prepYieldQuantity: 1500,
    prepYieldUnitId: 'ml',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 180,
    ingredients: [
      { productSlug: 'carrot', quantity: 200, unitId: 'g', rawText: '2 моркови' },
      { productSlug: 'onion-yellow', quantity: 200, unitId: 'g', rawText: '2 луковицы' },
      { productSlug: 'celery-stalk', quantity: 100, unitId: 'g', rawText: '3 стебля сельдерея' },
      { productSlug: 'garlic', quantity: 10, unitId: 'g', rawText: '2 зубчика чеснока' },
      { productSlug: 'parsley-fresh', quantity: 20, unitId: 'g', rawText: 'пучок петрушки' },
      { productSlug: 'bay-leaf', quantity: 2, unitId: 'pcs', rawText: '2 лавровых листа' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. чёрного перца горошком' },
      { productSlug: 'salt', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. соли' },
    ],
  },

  // ---------- Тесто (30 дней) ----------
  {
    slug: 'recipe-prep-shortcrust-dough',
    title: 'Заготовка: песочное тесто',
    description:
      'Классическое песочное тесто 500 г — на тарт или печенье. После замеса делится ' +
      'на 2 шара и убирается в морозилку.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-shortcrust-dough',
    prepYieldQuantity: 500,
    prepYieldUnitId: 'g',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 30,
    ingredients: [
      { productSlug: 'flour-wheat', quantity: 250, unitId: 'g', rawText: '250 г муки' },
      { productSlug: 'butter', quantity: 150, unitId: 'g', rawText: '150 г сливочного масла' },
      { productSlug: 'sugar-white', quantity: 50, unitId: 'g', rawText: '50 г сахара' },
      { productSlug: 'egg-chicken', quantity: 1, unitId: 'pcs', rawText: '1 яйцо' },
      { productSlug: 'salt', quantity: 1, unitId: 'pinch', rawText: 'щепотка соли' },
    ],
  },
  {
    slug: 'recipe-prep-yeast-dough',
    title: 'Заготовка: дрожжевое тесто',
    description:
      'Дрожжевое тесто 700 г для пирогов и булочек. Хранится в холодильнике 2-3 дня, ' +
      'в морозилке — до месяца.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-yeast-dough',
    prepYieldQuantity: 700,
    prepYieldUnitId: 'g',
    prepDefaultLocation: 'FRIDGE',
    prepShelfLifeDays: 30,
    ingredients: [
      { productSlug: 'flour-wheat', quantity: 400, unitId: 'g', rawText: '400 г муки' },
      { productSlug: 'milk', quantity: 200, unitId: 'ml', rawText: '200 мл молока' },
      { productSlug: 'butter', quantity: 50, unitId: 'g', rawText: '50 г сливочного масла' },
      { productSlug: 'sugar-white', quantity: 30, unitId: 'g', rawText: '30 г сахара' },
      { productSlug: 'egg-chicken', quantity: 1, unitId: 'pcs', rawText: '1 яйцо' },
      { productSlug: 'yeast-dry', quantity: 7, unitId: 'g', rawText: '7 г сухих дрожжей' },
      { productSlug: 'salt', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. соли' },
    ],
  },

  // ---------- Фарши и мясные базы (90 дней, FREEZER) ----------
  {
    slug: 'recipe-prep-pelmeni-mince',
    title: 'Заготовка: фарш для пельменей',
    description:
      'Классический пельменный фарш 800 г — пополам говядина и свинина, лук и специи.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-pelmeni-mince',
    prepYieldQuantity: 800,
    prepYieldUnitId: 'g',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 90,
    ingredients: [
      { productSlug: 'beef-mince', quantity: 400, unitId: 'g', rawText: '400 г говяжьего фарша' },
      { productSlug: 'pork-mince', quantity: 400, unitId: 'g', rawText: '400 г свиного фарша' },
      { productSlug: 'onion-yellow', quantity: 150, unitId: 'g', rawText: '1 крупная луковица' },
      { productSlug: 'garlic', quantity: 10, unitId: 'g', rawText: '2 зубчика чеснока' },
      { productSlug: 'salt', quantity: 2, unitId: 'tsp', rawText: '2 ч.л. соли' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. чёрного перца' },
    ],
  },
  {
    slug: 'recipe-prep-bolognese-sauce',
    title: 'Заготовка: соус болоньезе',
    description:
      'Густой соус болоньезе 1 кг на основе говяжьего фарша. Варится 1.5 часа, ' +
      'разливается по контейнерам и в морозилку.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-bolognese-sauce',
    prepYieldQuantity: 1000,
    prepYieldUnitId: 'g',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 90,
    ingredients: [
      { productSlug: 'beef-mince', quantity: 600, unitId: 'g', rawText: '600 г говяжьего фарша' },
      { productSlug: 'tomato-paste', quantity: 100, unitId: 'g', rawText: '100 г томатной пасты' },
      { productSlug: 'tomato', quantity: 300, unitId: 'g', rawText: '300 г помидоров' },
      { productSlug: 'onion-yellow', quantity: 150, unitId: 'g', rawText: '1 крупная луковица' },
      { productSlug: 'carrot', quantity: 100, unitId: 'g', rawText: '1 морковь' },
      { productSlug: 'celery-stalk', quantity: 80, unitId: 'g', rawText: '2 стебля сельдерея' },
      { productSlug: 'garlic', quantity: 10, unitId: 'g', rawText: '2 зубчика чеснока' },
      { productSlug: 'olive-oil', quantity: 3, unitId: 'tbsp', rawText: '3 ст.л. оливкового масла' },
      { productSlug: 'oregano', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. орегано' },
      { productSlug: 'basil', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. базилика' },
      { productSlug: 'salt', quantity: 2, unitId: 'tsp', rawText: '2 ч.л. соли' },
      { productSlug: 'pepper-black', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. чёрного перца' },
    ],
  },

  // ---------- Овощные базы и соусы (180 дней, FREEZER) ----------
  {
    slug: 'recipe-prep-soffritto',
    title: 'Заготовка: зажарка лук-морковь',
    description:
      'Базовая зажарка 500 г — пассерованный лук и морковь. Замораживается в плоских ' +
      'пакетах, удобно отламывать порциями.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-soffritto',
    prepYieldQuantity: 500,
    prepYieldUnitId: 'g',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 180,
    ingredients: [
      { productSlug: 'onion-yellow', quantity: 300, unitId: 'g', rawText: '2 крупные луковицы' },
      { productSlug: 'carrot', quantity: 250, unitId: 'g', rawText: '2 моркови' },
      { productSlug: 'sunflower-oil', quantity: 4, unitId: 'tbsp', rawText: '4 ст.л. растительного масла' },
      { productSlug: 'salt', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. соли' },
    ],
  },
  {
    slug: 'recipe-prep-tomato-sauce',
    title: 'Заготовка: базовый томатный соус',
    description:
      'Универсальный томатный соус 800 г на пасту, пиццу и тушёные блюда.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-tomato-sauce',
    prepYieldQuantity: 800,
    prepYieldUnitId: 'g',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 180,
    ingredients: [
      { productSlug: 'tomato', quantity: 800, unitId: 'g', rawText: '800 г помидоров' },
      { productSlug: 'tomato-paste', quantity: 60, unitId: 'g', rawText: '60 г томатной пасты' },
      { productSlug: 'onion-yellow', quantity: 100, unitId: 'g', rawText: '1 луковица' },
      { productSlug: 'garlic', quantity: 15, unitId: 'g', rawText: '3 зубчика чеснока' },
      { productSlug: 'olive-oil', quantity: 3, unitId: 'tbsp', rawText: '3 ст.л. оливкового масла' },
      { productSlug: 'basil', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. базилика' },
      { productSlug: 'oregano', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. орегано' },
      { productSlug: 'sugar-white', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. сахара' },
      { productSlug: 'salt', quantity: 1, unitId: 'tsp', rawText: '1 ч.л. соли' },
    ],
  },
  {
    slug: 'recipe-prep-berry-puree',
    title: 'Заготовка: ягодное пюре',
    description:
      'Сладкое ягодное пюре 500 г из клубники и малины — для сырников, мороженого, йогурта.',
    servings: 1,
    group: 'PREP',
    producesProductSlug: 'prep-berry-puree',
    prepYieldQuantity: 500,
    prepYieldUnitId: 'g',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 180,
    ingredients: [
      { productSlug: 'strawberry', quantity: 300, unitId: 'g', rawText: '300 г клубники' },
      { productSlug: 'raspberry', quantity: 200, unitId: 'g', rawText: '200 г малины' },
      { productSlug: 'sugar-white', quantity: 80, unitId: 'g', rawText: '80 г сахара' },
      { productSlug: 'lemon', quantity: 30, unitId: 'g', rawText: 'сок 1/4 лимона' },
    ],
  },
];
