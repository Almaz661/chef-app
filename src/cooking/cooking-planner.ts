/**
 * Pure consumption planner.
 *
 * Decides how to take `needs` (already in product base units) out of
 * `stock` (also in base units, grouped by product → location list).
 *
 * It does NOT mutate the database. The caller (CookingService) executes
 * the plan inside a single prisma.$transaction.
 *
 * If any product cannot be satisfied, the result is `ok: false` with
 * `lines: []` and a populated `shortages` array. There is intentionally
 * no concept of partial cooking — the caller must reject the request.
 */

export type Loc = 'PANTRY' | 'FRIDGE' | 'FREEZER';

export interface Need {
  productId: string;
  /** Quantity in base unit. Must be >= 0. */
  quantity: number;
  baseUnitId: string;
}

export interface StockEntry {
  location: Loc;
  /** Quantity in base unit. */
  quantity: number;
}

export interface PlanInput {
  needs: readonly Need[];
  stock: ReadonlyMap<string, readonly StockEntry[]>;
  preferLocation?: Loc;
  /** All locations that may be drained, in order. Default `['PANTRY','FRIDGE','FREEZER']`. */
  fallbackOrder?: readonly Loc[];
}

export interface PlanLine {
  productId: string;
  baseUnitId: string;
  /** Sum of `takeFrom[*].quantity`. */
  quantity: number;
  takeFrom: { location: Loc; quantity: number }[];
}

export interface Shortage {
  productId: string;
  need: number;
  have: number;
}

export interface PlanResult {
  ok: boolean;
  lines: PlanLine[];
  shortages: Shortage[];
}

const DEFAULT_ORDER: readonly Loc[] = ['PANTRY', 'FRIDGE', 'FREEZER'];
const EPS = 1e-9;

/**
 * Build the order of locations to drain: preferred one first (if listed),
 * then the rest of `fallbackOrder` minus duplicates.
 */
function locationOrder(prefer: Loc | undefined, fallback: readonly Loc[]): Loc[] {
  const seen = new Set<Loc>();
  const out: Loc[] = [];
  if (prefer && fallback.includes(prefer)) {
    out.push(prefer);
    seen.add(prefer);
  }
  for (const loc of fallback) {
    if (!seen.has(loc)) {
      out.push(loc);
      seen.add(loc);
    }
  }
  return out;
}

export function planConsumption(input: PlanInput): PlanResult {
  const order = locationOrder(input.preferLocation, input.fallbackOrder ?? DEFAULT_ORDER);
  const lines: PlanLine[] = [];
  const shortages: Shortage[] = [];

  for (const need of input.needs) {
    if (need.quantity <= EPS) continue; // 0-need ingredient: skip silently

    const stockList = input.stock.get(need.productId) ?? [];
    // Index stock by location for O(1) access; default 0.
    const byLoc = new Map<Loc, number>();
    for (const e of stockList) {
      byLoc.set(e.location, (byLoc.get(e.location) ?? 0) + e.quantity);
    }

    let remaining = need.quantity;
    const takes: { location: Loc; quantity: number }[] = [];

    for (const loc of order) {
      if (remaining <= EPS) break;
      const have = byLoc.get(loc) ?? 0;
      if (have <= EPS) continue;
      const take = Math.min(have, remaining);
      takes.push({ location: loc, quantity: take });
      remaining -= take;
      byLoc.set(loc, have - take);
    }

    if (remaining > EPS) {
      const totalHave = stockList.reduce((s, e) => s + e.quantity, 0);
      shortages.push({
        productId: need.productId,
        need: need.quantity,
        have: totalHave,
      });
    } else {
      lines.push({
        productId: need.productId,
        baseUnitId: need.baseUnitId,
        quantity: need.quantity,
        takeFrom: takes,
      });
    }
  }

  // Deterministic order so tests / API responses are stable.
  lines.sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
  shortages.sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));

  if (shortages.length > 0) {
    return { ok: false, lines: [], shortages };
  }
  return { ok: true, lines, shortages: [] };
}
