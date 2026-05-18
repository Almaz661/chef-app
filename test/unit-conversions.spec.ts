import { describe, expect, it } from 'bun:test';

import { ConversionDictionary, convertQuantity, findFactor } from '../src/units/unit-conversions';

const DICT: ConversionDictionary = [
  { productId: null, fromUnitId: 'kg', toUnitId: 'g', factor: 1000 },
  { productId: null, fromUnitId: 'g', toUnitId: 'kg', factor: 0.001 },
  { productId: null, fromUnitId: 'l', toUnitId: 'ml', factor: 1000 },
  { productId: 'p_flour', fromUnitId: 'tbsp', toUnitId: 'g', factor: 25 },
  { productId: 'p_oil', fromUnitId: 'tbsp', toUnitId: 'ml', factor: 15 },
];

describe('findFactor', () => {
  it('identity when from === to', () => {
    expect(findFactor(DICT, 'g', 'g', null)).toBe(1);
    expect(findFactor(DICT, 'g', 'g', 'p_flour')).toBe(1);
  });

  it('returns global rule when no product context', () => {
    expect(findFactor(DICT, 'kg', 'g', null)).toBe(1000);
  });

  it('product-specific rule wins over global for the same (from,to)', () => {
    // tbsp->g: only product rule exists, no global one.
    expect(findFactor(DICT, 'tbsp', 'g', 'p_flour')).toBe(25);
    // For another product, no rule.
    expect(findFactor(DICT, 'tbsp', 'g', 'p_oil')).toBeNull();
    expect(findFactor(DICT, 'tbsp', 'g', null)).toBeNull();
  });

  it('falls back to global if product rule absent', () => {
    expect(findFactor(DICT, 'kg', 'g', 'p_flour')).toBe(1000);
  });

  it('null for unknown path', () => {
    expect(findFactor(DICT, 'pinch', 'g', null)).toBeNull();
  });
});

describe('convertQuantity', () => {
  it('basic multiplication', () => {
    expect(convertQuantity(DICT, 2, 'kg', 'g', null)).toBe(2000);
    expect(convertQuantity(DICT, 2, 'tbsp', 'ml', 'p_oil')).toBe(30);
  });

  it('identity', () => {
    expect(convertQuantity(DICT, 7.5, 'g', 'g', null)).toBe(7.5);
  });

  it('null when no path', () => {
    expect(convertQuantity(DICT, 1, 'pinch', 'g', null)).toBeNull();
  });
});
