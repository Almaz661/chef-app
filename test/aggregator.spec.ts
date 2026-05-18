import { describe, expect, it } from 'bun:test';

import {
  aggregate,
  AggregateInputRecipe,
  ConvertFn,
  subtractStock,
} from '../src/shopping/aggregator';

const baseUnit = new Map<string, string>([
  ['p_tomato', 'g'],
  ['p_oil', 'ml'],
  ['p_salt', 'g'],
]);

// kg->g, l->ml, tbsp->ml (oil), pinch->g (salt). tbsp->g for salt is missing on purpose.
const convert: ConvertFn = (qty, from, to, productId) => {
  if (from === to) return qty;
  if (from === 'kg' && to === 'g') return qty * 1000;
  if (from === 'l' && to === 'ml') return qty * 1000;
  if (productId === 'p_oil' && from === 'tbsp' && to === 'ml') return qty * 15;
  if (productId === 'p_salt' && from === 'pinch' && to === 'g') return qty * 0.4;
  return null;
};

describe('aggregate', () => {
  it('scales ingredient quantity by servingsScale', () => {
    const recipes: AggregateInputRecipe[] = [
      {
        servingsScale: 2,
        ingredients: [{ productId: 'p_tomato', quantity: 100, unitId: 'g' }],
      },
    ];
    const r = aggregate(recipes, baseUnit, convert);
    expect(r.errors).toEqual([]);
    expect(r.items).toEqual([{ productId: 'p_tomato', quantity: 200, unitId: 'g' }]);
  });

  it('aggregates two recipes touching same product in different units', () => {
    const recipes: AggregateInputRecipe[] = [
      {
        servingsScale: 1,
        ingredients: [{ productId: 'p_tomato', quantity: 300, unitId: 'g' }],
      },
      {
        servingsScale: 1,
        ingredients: [{ productId: 'p_tomato', quantity: 0.2, unitId: 'kg' }],
      },
    ];
    const r = aggregate(recipes, baseUnit, convert);
    expect(r.errors).toEqual([]);
    expect(r.items).toEqual([{ productId: 'p_tomato', quantity: 500, unitId: 'g' }]);
  });

  it('uses product-specific conversion for tbsp->ml', () => {
    const recipes: AggregateInputRecipe[] = [
      {
        servingsScale: 1,
        ingredients: [{ productId: 'p_oil', quantity: 2, unitId: 'tbsp' }],
      },
    ];
    const r = aggregate(recipes, baseUnit, convert);
    expect(r.items).toEqual([{ productId: 'p_oil', quantity: 30, unitId: 'ml' }]);
  });

  it('reports missing conversion path; the product is excluded from items', () => {
    const recipes: AggregateInputRecipe[] = [
      {
        servingsScale: 1,
        ingredients: [{ productId: 'p_salt', quantity: 1, unitId: 'tbsp' }],
      },
    ];
    const r = aggregate(recipes, baseUnit, convert);
    expect(r.items).toEqual([]);
    expect(r.errors).toEqual([
      { productId: 'p_salt', fromUnitId: 'tbsp', toUnitId: 'g', reason: 'no_conversion_path' },
    ]);
  });

  it('reports unknown base unit when product is missing from map', () => {
    const recipes: AggregateInputRecipe[] = [
      {
        servingsScale: 1,
        ingredients: [{ productId: 'p_unknown', quantity: 1, unitId: 'g' }],
      },
    ];
    const r = aggregate(recipes, baseUnit, convert);
    expect(r.items).toEqual([]);
    expect(r.errors[0]?.reason).toBe('unknown_base_unit');
  });

  it('keeps successful items even when others error', () => {
    const recipes: AggregateInputRecipe[] = [
      {
        servingsScale: 1,
        ingredients: [
          { productId: 'p_tomato', quantity: 100, unitId: 'g' },
          { productId: 'p_salt', quantity: 1, unitId: 'tbsp' }, // no path
          { productId: 'p_salt', quantity: 1, unitId: 'pinch' },
        ],
      },
    ];
    const r = aggregate(recipes, baseUnit, convert);
    // p_tomato: 100g, p_salt: 0.4g (one error item still recorded)
    expect(r.items.find((i) => i.productId === 'p_tomato')).toEqual({
      productId: 'p_tomato',
      quantity: 100,
      unitId: 'g',
    });
    expect(r.items.find((i) => i.productId === 'p_salt')).toEqual({
      productId: 'p_salt',
      quantity: 0.4,
      unitId: 'g',
    });
    expect(r.errors.length).toBe(1);
  });

  it('returns deterministic order by productId', () => {
    const recipes: AggregateInputRecipe[] = [
      {
        servingsScale: 1,
        ingredients: [
          { productId: 'p_tomato', quantity: 1, unitId: 'g' },
          { productId: 'p_oil', quantity: 1, unitId: 'ml' },
        ],
      },
    ];
    const r = aggregate(recipes, baseUnit, convert);
    expect(r.items.map((i) => i.productId)).toEqual(['p_oil', 'p_tomato']);
  });
});

describe('subtractStock', () => {
  it('reduces by available stock and drops zeros', () => {
    const items = [
      { productId: 'p_tomato', quantity: 300, unitId: 'g' },
      { productId: 'p_oil', quantity: 30, unitId: 'ml' },
      { productId: 'p_salt', quantity: 0.4, unitId: 'g' },
    ];
    const stock = new Map<string, number>([
      ['p_tomato', 200],
      ['p_oil', 30], // exactly enough → drop
      ['p_salt', 999], // overflow → drop
    ]);
    const out = subtractStock(items, stock);
    expect(out).toEqual([{ productId: 'p_tomato', quantity: 100, unitId: 'g' }]);
  });

  it('passthrough when stock empty', () => {
    const items = [{ productId: 'p_tomato', quantity: 10, unitId: 'g' }];
    expect(subtractStock(items, new Map())).toEqual(items);
  });
});
