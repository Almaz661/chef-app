/**
 * Pure aggregator for shopping list generation.
 *
 * Responsibilities:
 *  - scale each ingredient quantity by `servingsScale`
 *  - convert to the product's base unit
 *  - sum across recipes by productId
 *
 * It does NOT touch the database — all conversion data is passed in via
 * `convert`. Failures are returned in `errors`, never thrown, so the caller
 * can decide whether to fail fast or partial-build.
 */

export interface AggregateInputIngredient {
  productId: string;
  quantity: number;
  unitId: string;
}

export interface AggregateInputRecipe {
  /** Multiplier = (menu_recipe.servings / recipe.servings). */
  servingsScale: number;
  ingredients: AggregateInputIngredient[];
}

export interface AggregatedItem {
  productId: string;
  /** Quantity in the product's base unit. */
  quantity: number;
  /** baseUnitId for the product. */
  unitId: string;
}

export interface AggregateError {
  productId: string;
  fromUnitId: string;
  toUnitId: string;
  reason: 'no_conversion_path' | 'unknown_base_unit';
}

export interface AggregateResult {
  items: AggregatedItem[];
  errors: AggregateError[];
}

export type ConvertFn = (
  qty: number,
  fromUnitId: string,
  toUnitId: string,
  productId: string,
) => number | null;

export function aggregate(
  recipes: AggregateInputRecipe[],
  productBaseUnit: ReadonlyMap<string, string>,
  convert: ConvertFn,
): AggregateResult {
  const totals = new Map<string, number>();
  const errors: AggregateError[] = [];

  for (const recipe of recipes) {
    const scale = recipe.servingsScale;
    for (const ing of recipe.ingredients) {
      const baseUnit = productBaseUnit.get(ing.productId);
      if (!baseUnit) {
        errors.push({
          productId: ing.productId,
          fromUnitId: ing.unitId,
          toUnitId: '?',
          reason: 'unknown_base_unit',
        });
        continue;
      }

      const scaledQty = ing.quantity * scale;
      const baseQty =
        ing.unitId === baseUnit ? scaledQty : convert(scaledQty, ing.unitId, baseUnit, ing.productId);

      if (baseQty === null) {
        errors.push({
          productId: ing.productId,
          fromUnitId: ing.unitId,
          toUnitId: baseUnit,
          reason: 'no_conversion_path',
        });
        continue;
      }

      totals.set(ing.productId, (totals.get(ing.productId) ?? 0) + baseQty);
    }
  }

  const items: AggregatedItem[] = [];
  for (const [productId, qty] of totals) {
    items.push({
      productId,
      quantity: qty,
      // Safe: only present in totals if baseUnit lookup succeeded.
      unitId: productBaseUnit.get(productId) as string,
    });
  }

  // Stable order (by productId) so tests / clients see deterministic output.
  items.sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
  return { items, errors };
}

/**
 * Subtract per-product stock from aggregated items. Items dropping to <= 0
 * are removed.
 */
export function subtractStock(
  items: AggregatedItem[],
  stock: ReadonlyMap<string, number>,
): AggregatedItem[] {
  const out: AggregatedItem[] = [];
  for (const it of items) {
    const have = stock.get(it.productId) ?? 0;
    const need = it.quantity - have;
    if (need > 1e-9) {
      out.push({ ...it, quantity: need });
    }
  }
  return out;
}
