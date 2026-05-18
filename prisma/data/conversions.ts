/**
 * Product-specific unit conversions for things that "1 tbsp" cannot be
 * derived from physics alone (different products have different densities).
 *
 * Source: standard household-cooking references for Russian cooking.
 * Don't optimize for grams of accuracy — these are for "ставлю по
 * рецепту, в граммах хочу видеть", not lab.
 */
export interface ProductConversion {
  productSlug: string;
  from: 'tbsp' | 'tsp' | 'pinch' | 'pcs';
  to: 'g' | 'ml';
  factor: number;
}

export const PRODUCT_CONVERSIONS: ProductConversion[] = [
  // ---- мука ----
  { productSlug: 'flour-wheat', from: 'tbsp', to: 'g', factor: 25 },
  { productSlug: 'flour-wheat', from: 'tsp', to: 'g', factor: 8 },
  { productSlug: 'flour-rye', from: 'tbsp', to: 'g', factor: 25 },
  { productSlug: 'flour-rye', from: 'tsp', to: 'g', factor: 8 },
  { productSlug: 'flour-whole-wheat', from: 'tbsp', to: 'g', factor: 30 },
  { productSlug: 'flour-whole-wheat', from: 'tsp', to: 'g', factor: 10 },

  // ---- масла ----
  { productSlug: 'olive-oil', from: 'tbsp', to: 'ml', factor: 15 },
  { productSlug: 'olive-oil', from: 'tsp', to: 'ml', factor: 5 },
  { productSlug: 'sunflower-oil', from: 'tbsp', to: 'ml', factor: 15 },
  { productSlug: 'sunflower-oil', from: 'tsp', to: 'ml', factor: 5 },
  { productSlug: 'sesame-oil', from: 'tbsp', to: 'ml', factor: 15 },
  { productSlug: 'sesame-oil', from: 'tsp', to: 'ml', factor: 5 },
  { productSlug: 'butter', from: 'tbsp', to: 'g', factor: 17 },
  { productSlug: 'butter', from: 'tsp', to: 'g', factor: 5 },

  // ---- соль/сахар/специи ----
  { productSlug: 'salt', from: 'tsp', to: 'g', factor: 5 },
  { productSlug: 'salt', from: 'tbsp', to: 'g', factor: 25 },
  { productSlug: 'salt', from: 'pinch', to: 'g', factor: 0.4 },
  { productSlug: 'sugar-white', from: 'tsp', to: 'g', factor: 4 },
  { productSlug: 'sugar-white', from: 'tbsp', to: 'g', factor: 20 },
  { productSlug: 'sugar-brown', from: 'tsp', to: 'g', factor: 4 },
  { productSlug: 'sugar-brown', from: 'tbsp', to: 'g', factor: 20 },
  { productSlug: 'powdered-sugar', from: 'tsp', to: 'g', factor: 3 },
  { productSlug: 'powdered-sugar', from: 'tbsp', to: 'g', factor: 10 },
  { productSlug: 'cocoa-powder', from: 'tsp', to: 'g', factor: 3 },
  { productSlug: 'cocoa-powder', from: 'tbsp', to: 'g', factor: 9 },
  { productSlug: 'baking-powder', from: 'tsp', to: 'g', factor: 4 },
  { productSlug: 'baking-soda', from: 'tsp', to: 'g', factor: 4 },
  { productSlug: 'yeast-dry', from: 'tsp', to: 'g', factor: 3 },

  // ---- крупы (сухие) ----
  { productSlug: 'rice-white', from: 'tbsp', to: 'g', factor: 15 },
  { productSlug: 'rice-brown', from: 'tbsp', to: 'g', factor: 15 },
  { productSlug: 'buckwheat', from: 'tbsp', to: 'g', factor: 18 },
  { productSlug: 'oats', from: 'tbsp', to: 'g', factor: 10 },
  { productSlug: 'millet', from: 'tbsp', to: 'g', factor: 18 },
  { productSlug: 'semolina', from: 'tbsp', to: 'g', factor: 25 },

  // ---- соусы/приправы (жидкие) ----
  { productSlug: 'soy-sauce', from: 'tbsp', to: 'ml', factor: 15 },
  { productSlug: 'soy-sauce', from: 'tsp', to: 'ml', factor: 5 },
  { productSlug: 'vinegar-wine', from: 'tbsp', to: 'ml', factor: 15 },
  { productSlug: 'vinegar-balsamic', from: 'tbsp', to: 'ml', factor: 15 },
  { productSlug: 'vinegar-apple', from: 'tbsp', to: 'ml', factor: 15 },
  { productSlug: 'tomato-paste', from: 'tbsp', to: 'g', factor: 17 },
  { productSlug: 'mustard', from: 'tsp', to: 'g', factor: 5 },
  { productSlug: 'mayonnaise', from: 'tbsp', to: 'g', factor: 17 },
  { productSlug: 'ketchup', from: 'tbsp', to: 'g', factor: 17 },

  // ---- сметана / сливки ----
  { productSlug: 'sour-cream', from: 'tbsp', to: 'g', factor: 25 },
  { productSlug: 'sour-cream', from: 'tsp', to: 'g', factor: 9 },
  { productSlug: 'cream-10', from: 'tbsp', to: 'ml', factor: 15 },
  { productSlug: 'cream-33', from: 'tbsp', to: 'ml', factor: 15 },

  // ---- сладкое ----
  { productSlug: 'honey', from: 'tbsp', to: 'g', factor: 21 },
  { productSlug: 'honey', from: 'tsp', to: 'g', factor: 7 },

  // ---- молотые специи (по 1 ч.л. ≈ 2-3 г, округлим) ----
  { productSlug: 'pepper-black', from: 'tsp', to: 'g', factor: 3 },
  { productSlug: 'pepper-black', from: 'pinch', to: 'g', factor: 0.3 },
  { productSlug: 'pepper-red', from: 'tsp', to: 'g', factor: 3 },
  { productSlug: 'paprika', from: 'tsp', to: 'g', factor: 3 },
  { productSlug: 'cinnamon', from: 'tsp', to: 'g', factor: 3 },
  { productSlug: 'curry-powder', from: 'tsp', to: 'g', factor: 3 },
];
