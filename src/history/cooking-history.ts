/**
 * Pure formatter for cooking-history "consumed" rows.
 *
 * Takes raw InventoryTxn rows (which store consumption with NEGATIVE
 * quantity) plus a product name lookup, and returns a positive-quantity
 * list grouped by product.
 *
 * Several txns may exist per (cook, product) when Phase 4 batches were
 * involved — `pickBatches` writes one txn per drained batch in some
 * paths. We collapse them to one row per product here so the UI shows
 * a clean "you used X of Y" line.
 */

export interface RawTxn {
  productId: string;
  /** Stored as negative number for CONSUMPTION; we'll invert. */
  quantity: number;
  unitId: string;
}

export interface ProductInfo {
  id: string;
  name: string;
}

export interface ConsumedItem {
  productId: string;
  productName: string;
  /** Positive base-unit quantity (sign already flipped). */
  quantity: number;
  baseUnitId: string;
}

const UNKNOWN_PRODUCT_NAME = '(unknown)';

export function formatConsumed(
  txns: readonly RawTxn[],
  products: ReadonlyMap<string, ProductInfo>,
): ConsumedItem[] {
  const byProduct = new Map<string, ConsumedItem>();

  for (const t of txns) {
    const positive = -t.quantity;
    const existing = byProduct.get(t.productId);
    if (existing) {
      existing.quantity += positive;
      // unitId is already the base unit (CONSUMPTION always writes base);
      // we keep the first one we saw — they should all match.
      continue;
    }
    byProduct.set(t.productId, {
      productId: t.productId,
      productName: products.get(t.productId)?.name ?? UNKNOWN_PRODUCT_NAME,
      quantity: positive,
      baseUnitId: t.unitId,
    });
  }

  // Stable ordering by product name (then id) so UI lists don't shuffle.
  return [...byProduct.values()].sort((a, b) => {
    if (a.productName !== b.productName) {
      return a.productName < b.productName ? -1 : 1;
    }
    return a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0;
  });
}
