/**
 * Pure compute helper for Phase 6.7 (Preps).
 *
 * Given a PREP recipe definition + servings scale + "now", returns the
 * shape of the InventoryItem that CookingService should create after
 * draining ingredients. No DB access, no Prisma types — easy to test.
 *
 * Caller (CookingService.cook) wraps thrown Errors into BadRequest.
 */

export type PrepLocation = 'FRIDGE' | 'FREEZER';

export interface PrepYieldInput {
  producesProductId: string;
  /** > 0. Yield per single recipe portion, in `prepYieldUnitId`. */
  prepYieldQuantity: number;
  prepYieldUnitId: string;
  prepDefaultLocation: PrepLocation;
  /** > 0. Whole days. */
  prepShelfLifeDays: number;
  /** = MenuRecipe.servings / Recipe.servings, must be > 0. */
  scale: number;
  now: Date;
}

export interface PrepYieldResult {
  productId: string;
  /** Final quantity in `unitId` (already scaled). */
  quantity: number;
  unitId: string;
  location: PrepLocation;
  /** now + prepShelfLifeDays * 24h. */
  expiresAt: Date;
  /** = now. */
  acquiredAt: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computePrepYield(input: PrepYieldInput): PrepYieldResult {
  if (!input.producesProductId) {
    throw new Error('computePrepYield: producesProductId is required');
  }
  if (!input.prepYieldUnitId) {
    throw new Error('computePrepYield: prepYieldUnitId is required');
  }
  if (!(input.prepYieldQuantity > 0)) {
    throw new Error(
      `computePrepYield: prepYieldQuantity must be > 0, got ${input.prepYieldQuantity}`,
    );
  }
  if (!(input.prepShelfLifeDays > 0) || !Number.isFinite(input.prepShelfLifeDays)) {
    throw new Error(
      `computePrepYield: prepShelfLifeDays must be > 0, got ${input.prepShelfLifeDays}`,
    );
  }
  if (!(input.scale > 0)) {
    throw new Error(`computePrepYield: scale must be > 0, got ${input.scale}`);
  }
  if (input.prepDefaultLocation !== 'FRIDGE' && input.prepDefaultLocation !== 'FREEZER') {
    throw new Error(
      `computePrepYield: prepDefaultLocation must be FRIDGE or FREEZER, got ${input.prepDefaultLocation}`,
    );
  }

  const quantity = input.prepYieldQuantity * input.scale;
  const acquiredAt = new Date(input.now.getTime());
  const expiresAt = new Date(input.now.getTime() + input.prepShelfLifeDays * MS_PER_DAY);

  return {
    productId: input.producesProductId,
    quantity,
    unitId: input.prepYieldUnitId,
    location: input.prepDefaultLocation,
    expiresAt,
    acquiredAt,
  };
}

/**
 * Identifies whether a Recipe is a PREP recipe by checking that ALL five
 * coupled fields are non-null. Returns:
 *   - 'prep' if all five are filled,
 *   - 'regular' if all five are null,
 *   - 'partial' if it's a mix (invalid state — caller should reject).
 */
export type PrepCheckResult = 'prep' | 'regular' | 'partial';

export interface PrepFields {
  producesProductId: string | null | undefined;
  prepYieldQuantity: number | string | null | undefined;
  prepYieldUnitId: string | null | undefined;
  prepDefaultLocation: string | null | undefined;
  prepShelfLifeDays: number | null | undefined;
}

export function classifyPrepFields(fields: PrepFields): PrepCheckResult {
  const flags = [
    fields.producesProductId != null,
    fields.prepYieldQuantity != null,
    fields.prepYieldUnitId != null,
    fields.prepDefaultLocation != null,
    fields.prepShelfLifeDays != null,
  ];
  const filled = flags.filter(Boolean).length;
  if (filled === 0) return 'regular';
  if (filled === 5) return 'prep';
  return 'partial';
}
