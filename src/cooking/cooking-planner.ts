/**
 * Pure batch-aware consumption planner (Phase 4).
 *
 * Takes a list of `needs` (already in product base units) and decides
 * which inventory batches to drain, in what order, and by how much.
 *
 * Order priority:
 *   1. preferLocation, then fallbackOrder (default PANTRY → FRIDGE → FREEZER).
 *   2. Inside each location, batches are sorted:
 *        a. expired first (expiresAt < now);
 *        b. then by expiresAt asc, with `null` (no expiry) at the very end;
 *        c. tiebreaker: acquiredAt asc (older first).
 *
 * Side-effect-free. Caller (CookingService) executes the plan inside one
 * prisma.$transaction.
 *
 * If any product cannot be fully satisfied, result is `ok: false` with
 * `lines: []` — we never produce a partial cook.
 */

export type Loc = 'PANTRY' | 'FRIDGE' | 'FREEZER';

export interface Batch {
  id: string;
  productId: string;
  location: Loc;
  /** Quantity in product base unit. */
  quantity: number;
  expiresAt: Date | null;
  acquiredAt: Date;
}

export interface Need {
  productId: string;
  /** Quantity in base unit. Must be >= 0. */
  quantity: number;
  baseUnitId: string;
}

export interface PickInput {
  needs: readonly Need[];
  /** Batches grouped by productId. */
  batches: ReadonlyMap<string, readonly Batch[]>;
  preferLocation?: Loc;
  fallbackOrder?: readonly Loc[];
  /** "Now" used to decide which batches are already expired. */
  now: Date;
}

export interface PickTake {
  batchId: string;
  location: Loc;
  /** Quantity to subtract from the batch (in base unit). */
  quantity: number;
  /** True iff this batch was already past its expiry at `now`. */
  expired: boolean;
}

export interface PickLine {
  productId: string;
  baseUnitId: string;
  /** Sum of takes' quantities. */
  quantity: number;
  takes: PickTake[];
}

export interface Shortage {
  productId: string;
  need: number;
  have: number;
}

export interface PickResult {
  ok: boolean;
  lines: PickLine[];
  shortages: Shortage[];
}

const DEFAULT_ORDER: readonly Loc[] = ['PANTRY', 'FRIDGE', 'FREEZER'];
const EPS = 1e-9;

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

/**
 * Sort batches inside one location by FEFO with deterministic tiebreaks.
 * Mutates the input array — pass a copy if you care.
 */
function sortBatchesFEFO(list: Batch[], now: Date): Batch[] {
  const nowMs = now.getTime();
  return list.sort((a, b) => {
    const aExp = a.expiresAt ? a.expiresAt.getTime() : null;
    const bExp = b.expiresAt ? b.expiresAt.getTime() : null;
    const aPast = aExp !== null && aExp < nowMs;
    const bPast = bExp !== null && bExp < nowMs;

    // Already-expired first, but only relative to non-expired ones.
    if (aPast !== bPast) return aPast ? -1 : 1;

    // Both have a date (or both expired) → soonest first.
    if (aExp !== null && bExp !== null) {
      if (aExp !== bExp) return aExp - bExp;
    } else if (aExp === null && bExp !== null) {
      return 1;  // null goes last
    } else if (aExp !== null && bExp === null) {
      return -1; // dated goes first
    }

    // Tiebreak by acquiredAt asc (older first).
    const aAcq = a.acquiredAt.getTime();
    const bAcq = b.acquiredAt.getTime();
    if (aAcq !== bAcq) return aAcq - bAcq;

    // Final tiebreak by id for absolute determinism.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function pickBatches(input: PickInput): PickResult {
  const order = locationOrder(input.preferLocation, input.fallbackOrder ?? DEFAULT_ORDER);
  const lines: PickLine[] = [];
  const shortages: Shortage[] = [];
  const nowMs = input.now.getTime();

  for (const need of input.needs) {
    if (need.quantity <= EPS) continue;

    const all = input.batches.get(need.productId) ?? [];
    // Group by location.
    const byLoc = new Map<Loc, Batch[]>();
    for (const b of all) {
      const list = byLoc.get(b.location) ?? [];
      list.push(b);
      byLoc.set(b.location, list);
    }

    let remaining = need.quantity;
    const takes: PickTake[] = [];

    for (const loc of order) {
      if (remaining <= EPS) break;
      const bucket = byLoc.get(loc);
      if (!bucket || bucket.length === 0) continue;

      const sorted = sortBatchesFEFO([...bucket], input.now);
      for (const batch of sorted) {
        if (remaining <= EPS) break;
        if (batch.quantity <= EPS) continue;

        const take = Math.min(batch.quantity, remaining);
        const expired =
          batch.expiresAt !== null && batch.expiresAt.getTime() < nowMs;
        takes.push({
          batchId: batch.id,
          location: loc,
          quantity: take,
          expired,
        });
        remaining -= take;
      }
    }

    if (remaining > EPS) {
      const totalHave = all.reduce((s, b) => s + b.quantity, 0);
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
        takes,
      });
    }
  }

  // Deterministic order across products.
  lines.sort((a, b) => (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0));
  shortages.sort((a, b) =>
    a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0,
  );

  if (shortages.length > 0) {
    return { ok: false, lines: [], shortages };
  }
  return { ok: true, lines, shortages: [] };
}
