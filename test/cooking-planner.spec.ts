import { describe, expect, it } from 'bun:test';

import { Loc, planConsumption, StockEntry } from '../src/cooking/cooking-planner';

const stockOf = (entries: Record<string, Partial<Record<Loc, number>>>) => {
  const map = new Map<string, StockEntry[]>();
  for (const [productId, byLoc] of Object.entries(entries)) {
    const list: StockEntry[] = [];
    for (const [loc, qty] of Object.entries(byLoc) as [Loc, number][]) {
      list.push({ location: loc, quantity: qty });
    }
    map.set(productId, list);
  }
  return map;
};

describe('planConsumption', () => {
  it('takes from preferLocation first when it has enough', () => {
    const r = planConsumption({
      needs: [{ productId: 'p_oil', quantity: 30, baseUnitId: 'ml' }],
      stock: stockOf({ p_oil: { PANTRY: 10, FRIDGE: 100 } }),
      preferLocation: 'FRIDGE',
      fallbackOrder: ['PANTRY', 'FRIDGE', 'FREEZER'],
    });
    expect(r.ok).toBe(true);
    expect(r.lines).toEqual([
      {
        productId: 'p_oil',
        baseUnitId: 'ml',
        quantity: 30,
        takeFrom: [{ location: 'FRIDGE', quantity: 30 }],
      },
    ]);
  });

  it('falls through to next location when prefer cannot satisfy fully', () => {
    const r = planConsumption({
      needs: [{ productId: 'p_tomato', quantity: 300, baseUnitId: 'g' }],
      stock: stockOf({ p_tomato: { PANTRY: 200, FRIDGE: 500 } }),
      preferLocation: 'PANTRY',
      fallbackOrder: ['PANTRY', 'FRIDGE', 'FREEZER'],
    });
    expect(r.ok).toBe(true);
    expect(r.lines[0].takeFrom).toEqual([
      { location: 'PANTRY', quantity: 200 },
      { location: 'FRIDGE', quantity: 100 },
    ]);
  });

  it('uses default order when preferLocation is undefined', () => {
    const r = planConsumption({
      needs: [{ productId: 'p_salt', quantity: 5, baseUnitId: 'g' }],
      stock: stockOf({ p_salt: { FRIDGE: 5, PANTRY: 5 } }),
      // PANTRY first by default
    });
    expect(r.ok).toBe(true);
    expect(r.lines[0].takeFrom).toEqual([{ location: 'PANTRY', quantity: 5 }]);
  });

  it('returns ok=false with shortages when stock is insufficient', () => {
    const r = planConsumption({
      needs: [
        { productId: 'p_tomato', quantity: 300, baseUnitId: 'g' },
        { productId: 'p_oil', quantity: 30, baseUnitId: 'ml' },
      ],
      stock: stockOf({
        p_tomato: { PANTRY: 100 }, // 200g short
        p_oil: { FRIDGE: 30 }, // ok
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.lines).toEqual([]);
    expect(r.shortages).toEqual([
      { productId: 'p_tomato', need: 300, have: 100 },
    ]);
  });

  it('reports shortage when product is missing from stock entirely', () => {
    const r = planConsumption({
      needs: [{ productId: 'p_unknown', quantity: 1, baseUnitId: 'g' }],
      stock: stockOf({}),
    });
    expect(r.ok).toBe(false);
    expect(r.shortages).toEqual([{ productId: 'p_unknown', need: 1, have: 0 }]);
  });

  it('skips zero-quantity needs silently', () => {
    const r = planConsumption({
      needs: [
        { productId: 'p_salt', quantity: 0, baseUnitId: 'g' },
        { productId: 'p_tomato', quantity: 50, baseUnitId: 'g' },
      ],
      stock: stockOf({ p_tomato: { PANTRY: 100 } }),
    });
    expect(r.ok).toBe(true);
    expect(r.lines).toEqual([
      {
        productId: 'p_tomato',
        baseUnitId: 'g',
        quantity: 50,
        takeFrom: [{ location: 'PANTRY', quantity: 50 }],
      },
    ]);
  });

  it('output is sorted by productId for determinism', () => {
    const r = planConsumption({
      needs: [
        { productId: 'p_tomato', quantity: 10, baseUnitId: 'g' },
        { productId: 'p_oil', quantity: 5, baseUnitId: 'ml' },
        { productId: 'p_salt', quantity: 1, baseUnitId: 'g' },
      ],
      stock: stockOf({
        p_tomato: { PANTRY: 100 },
        p_oil: { PANTRY: 100 },
        p_salt: { PANTRY: 100 },
      }),
    });
    expect(r.lines.map((l) => l.productId)).toEqual(['p_oil', 'p_salt', 'p_tomato']);
  });

  it('all-or-nothing: any shortage clears all lines', () => {
    const r = planConsumption({
      needs: [
        { productId: 'p_tomato', quantity: 10, baseUnitId: 'g' }, // ok
        { productId: 'p_salt', quantity: 1000, baseUnitId: 'g' }, // short
      ],
      stock: stockOf({
        p_tomato: { PANTRY: 100 },
        p_salt: { PANTRY: 1 },
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.lines).toEqual([]);
    expect(r.shortages).toEqual([{ productId: 'p_salt', need: 1000, have: 1 }]);
  });
});
