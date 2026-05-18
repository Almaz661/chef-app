/**
 * Pure helpers for unit conversion.
 *
 * Selection priority for `factor(from, to, productId)`:
 *   1. product-specific rule (productId, from, to)
 *   2. global rule         (productId IS NULL, from, to)
 *   3. null  (no path known)
 *
 * Identity (from === to) always returns 1 regardless of dictionary.
 */

export interface ConversionRule {
  productId: string | null;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
}

export type ConversionDictionary = ReadonlyArray<ConversionRule>;

/**
 * Find the most specific factor for a (from, to) pair, optionally scoped to
 * a product. Returns null when no rule matches.
 */
export function findFactor(
  dict: ConversionDictionary,
  fromUnitId: string,
  toUnitId: string,
  productId: string | null,
): number | null {
  if (fromUnitId === toUnitId) return 1;

  if (productId) {
    const specific = dict.find(
      (r) =>
        r.productId === productId && r.fromUnitId === fromUnitId && r.toUnitId === toUnitId,
    );
    if (specific) return specific.factor;
  }

  const global = dict.find(
    (r) => r.productId === null && r.fromUnitId === fromUnitId && r.toUnitId === toUnitId,
  );
  return global ? global.factor : null;
}

/**
 * Convert `qty` from one unit to another using a precomputed dictionary.
 * Returns `null` (NOT throws) when conversion is impossible — the caller
 * decides whether to error out or accumulate the failure.
 */
export function convertQuantity(
  dict: ConversionDictionary,
  qty: number,
  fromUnitId: string,
  toUnitId: string,
  productId: string | null,
): number | null {
  const factor = findFactor(dict, fromUnitId, toUnitId, productId);
  if (factor === null) return null;
  return qty * factor;
}
