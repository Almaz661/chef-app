import { describe, expect, it } from 'bun:test';

import {
  ProductInfo,
  RawTxn,
  formatConsumed,
} from '../src/history/cooking-history';

const products: ReadonlyMap<string, ProductInfo> = new Map([
  ['p_tomato', { id: 'p_tomato', name: 'Помидор' }],
  ['p_oil', { id: 'p_oil', name: 'Масло оливковое' }],
  ['p_salt', { id: 'p_salt', name: 'Соль' }],
]);

describe('formatConsumed', () => {
  it('inverts negative quantities to positives', () => {
    const txns: RawTxn[] = [
      { productId: 'p_tomato', quantity: -300, unitId: 'g' },
    ];
    expect(formatConsumed(txns, products)).toEqual([
      { productId: 'p_tomato', productName: 'Помидор', quantity: 300, baseUnitId: 'g' },
    ]);
  });

  it('looks up product names via the map', () => {
    const txns: RawTxn[] = [
      { productId: 'p_oil', quantity: -30, unitId: 'ml' },
      { productId: 'p_salt', quantity: -1, unitId: 'g' },
    ];
    const out = formatConsumed(txns, products);
    expect(out.map((c) => c.productName)).toEqual(['Масло оливковое', 'Соль']);
  });

  it('falls back to "(unknown)" for missing products without throwing', () => {
    const txns: RawTxn[] = [
      { productId: 'p_ghost', quantity: -10, unitId: 'g' },
    ];
    expect(formatConsumed(txns, products)).toEqual([
      { productId: 'p_ghost', productName: '(unknown)', quantity: 10, baseUnitId: 'g' },
    ]);
  });

  it('groups multiple txns of the same product into one row', () => {
    const txns: RawTxn[] = [
      { productId: 'p_tomato', quantity: -100, unitId: 'g' }, // batch 1
      { productId: 'p_tomato', quantity: -200, unitId: 'g' }, // batch 2
      { productId: 'p_oil', quantity: -15, unitId: 'ml' },
    ];
    const out = formatConsumed(txns, products);
    expect(out).toHaveLength(2);
    expect(out.find((c) => c.productId === 'p_tomato')?.quantity).toBe(300);
    expect(out.find((c) => c.productId === 'p_oil')?.quantity).toBe(15);
  });

  it('sorts items deterministically by product name', () => {
    const txns: RawTxn[] = [
      { productId: 'p_salt', quantity: -1, unitId: 'g' },
      { productId: 'p_oil', quantity: -30, unitId: 'ml' },
      { productId: 'p_tomato', quantity: -300, unitId: 'g' },
    ];
    const out = formatConsumed(txns, products);
    // Russian alphabetical order: М, П, С
    expect(out.map((c) => c.productName)).toEqual(['Масло оливковое', 'Помидор', 'Соль']);
  });
});
