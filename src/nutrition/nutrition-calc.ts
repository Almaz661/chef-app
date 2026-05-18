/**
 * Pure helpers for KBJU (kcal/protein/fat/carbs) calculation.
 *
 * Convention: `Per100` fields are nutrients per 100 base units of the
 * product (grams for MASS, millilitres for VOLUME). `kcal` is in
 * kilocalories; protein/fat/carbs are in grams.
 *
 * No DB access here. All inputs are pre-loaded by the caller.
 */

export interface Nutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface ProductNutrition {
  baseUnitId: string;
  kcalPer100: number | null;
  proteinPer100: number | null;
  fatPer100: number | null;
  carbsPer100: number | null;
}

export interface NutritionInputIngredient {
  productId: string;
  quantity: number;
  unitId: string;
}

export type ConvertFn = (
  qty: number,
  fromUnitId: string,
  toUnitId: string,
  productId: string,
) => number | null;

export interface ComputeNutritionArgs {
  ingredients: readonly NutritionInputIngredient[];
  products: ReadonlyMap<string, ProductNutrition>;
  convert: ConvertFn;
  /** Multiplier applied to the final totals. Default 1. */
  scale?: number;
}

export type NutritionErrorReason =
  | 'unknown_product'
  | 'no_conversion_path';

export interface NutritionError {
  productId: string;
  reason: NutritionErrorReason;
  fromUnitId?: string;
  baseUnitId?: string;
}

export interface ComputeNutritionResult {
  nutrition: Nutrition;
  /** True iff at least one ingredient's product was missing some Per100 field. */
  incomplete: boolean;
  errors: NutritionError[];
}

const ZERO: Nutrition = Object.freeze({ kcal: 0, protein: 0, fat: 0, carbs: 0 });

/**
 * Compute summed nutrition for a list of ingredients.
 *
 * Errors are accumulated, not thrown. Ingredients with errors are skipped
 * in the sum. The caller decides how to surface errors to the client.
 */
export function computeNutrition(args: ComputeNutritionArgs): ComputeNutritionResult {
  const totals = { ...ZERO };
  let incomplete = false;
  const errors: NutritionError[] = [];

  for (const ing of args.ingredients) {
    const product = args.products.get(ing.productId);
    if (!product) {
      errors.push({ productId: ing.productId, reason: 'unknown_product' });
      continue;
    }

    const baseQty =
      ing.unitId === product.baseUnitId
        ? ing.quantity
        : args.convert(ing.quantity, ing.unitId, product.baseUnitId, ing.productId);

    if (baseQty === null) {
      errors.push({
        productId: ing.productId,
        reason: 'no_conversion_path',
        fromUnitId: ing.unitId,
        baseUnitId: product.baseUnitId,
      });
      continue;
    }

    const factor = baseQty / 100;

    if (product.kcalPer100 !== null) totals.kcal += product.kcalPer100 * factor;
    else incomplete = true;

    if (product.proteinPer100 !== null) totals.protein += product.proteinPer100 * factor;
    else incomplete = true;

    if (product.fatPer100 !== null) totals.fat += product.fatPer100 * factor;
    else incomplete = true;

    if (product.carbsPer100 !== null) totals.carbs += product.carbsPer100 * factor;
    else incomplete = true;
  }

  const scale = args.scale ?? 1;
  if (scale !== 1) {
    totals.kcal *= scale;
    totals.protein *= scale;
    totals.fat *= scale;
    totals.carbs *= scale;
  }

  return { nutrition: totals, incomplete, errors };
}

/**
 * Divide nutrition by `n` (e.g. for per-serving calculation). Safe against
 * `n = 0` — returns zeros.
 */
export function divideNutrition(n: Nutrition, by: number): Nutrition {
  if (by <= 0) return { ...ZERO };
  return {
    kcal: n.kcal / by,
    protein: n.protein / by,
    fat: n.fat / by,
    carbs: n.carbs / by,
  };
}

/** Sum two nutrition records into a new object. */
export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carbs: a.carbs + b.carbs,
  };
}

export const ZERO_NUTRITION: Nutrition = ZERO;
