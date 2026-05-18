import { describe, expect, it } from 'bun:test';

import {
  ConvertFn,
  ProductNutrition,
  addNutrition,
  computeNutrition,
  divideNutrition,
} from '../src/nutrition/nutrition-calc';

const products = new Map<string, ProductNutrition>([
  [
    'p_tomato',
    { baseUnitId: 'g', kcalPer100: 18, proteinPer100: 0.9, fatPer100: 0.2, carbsPer100: 3.9 },
  ],
  [
    'p_flour',
    { baseUnitId: 'g', kcalPer100: 364, proteinPer100: 10.3, fatPer100: 1.1, carbsPer100: 76 },
  ],
  [
    // intentionally missing protein/fat/carbs (only kcal)
    'p_partial',
    { baseUnitId: 'g', kcalPer100: 200, proteinPer100: null, fatPer100: null, carbsPer100: null },
  ],
]);

const convert: ConvertFn = (qty, from, to) => {
  if (from === to) return qty;
  if (from === 'kg' && to === 'g') return qty * 1000;
  return null;
};

const closeTo = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

describe('computeNutrition', () => {
  it('100 g of tomato → 18 kcal / 0.9 P / 0.2 F / 3.9 C', () => {
    const r = computeNutrition({
      ingredients: [{ productId: 'p_tomato', quantity: 100, unitId: 'g' }],
      products,
      convert,
    });
    expect(r.errors).toEqual([]);
    expect(r.incomplete).toBe(false);
    expect(closeTo(r.nutrition.kcal, 18)).toBe(true);
    expect(closeTo(r.nutrition.protein, 0.9)).toBe(true);
    expect(closeTo(r.nutrition.fat, 0.2)).toBe(true);
    expect(closeTo(r.nutrition.carbs, 3.9)).toBe(true);
  });

  it('0.5 kg of flour converts to 500 g (=1820 kcal)', () => {
    const r = computeNutrition({
      ingredients: [{ productId: 'p_flour', quantity: 0.5, unitId: 'kg' }],
      products,
      convert,
    });
    expect(r.errors).toEqual([]);
    expect(closeTo(r.nutrition.kcal, 1820)).toBe(true);
  });

  it('sums multiple ingredients', () => {
    const r = computeNutrition({
      ingredients: [
        { productId: 'p_tomato', quantity: 100, unitId: 'g' }, // 18 kcal
        { productId: 'p_flour', quantity: 200, unitId: 'g' }, // 728 kcal
      ],
      products,
      convert,
    });
    expect(r.errors).toEqual([]);
    expect(closeTo(r.nutrition.kcal, 18 + 728)).toBe(true);
  });

  it('marks incomplete when any per-100 field is null but still adds present fields', () => {
    const r = computeNutrition({
      ingredients: [{ productId: 'p_partial', quantity: 100, unitId: 'g' }],
      products,
      convert,
    });
    expect(r.errors).toEqual([]);
    expect(r.incomplete).toBe(true);
    expect(closeTo(r.nutrition.kcal, 200)).toBe(true);
    expect(r.nutrition.protein).toBe(0);
    expect(r.nutrition.fat).toBe(0);
    expect(r.nutrition.carbs).toBe(0);
  });

  it('reports unknown product without contributing to totals', () => {
    const r = computeNutrition({
      ingredients: [
        { productId: 'p_tomato', quantity: 100, unitId: 'g' },
        { productId: 'p_unknown', quantity: 50, unitId: 'g' },
      ],
      products,
      convert,
    });
    expect(closeTo(r.nutrition.kcal, 18)).toBe(true);
    expect(r.errors).toEqual([{ productId: 'p_unknown', reason: 'unknown_product' }]);
  });

  it('reports missing conversion path without contributing', () => {
    const r = computeNutrition({
      ingredients: [{ productId: 'p_flour', quantity: 1, unitId: 'tbsp' }],
      products,
      convert,
    });
    expect(r.nutrition.kcal).toBe(0);
    expect(r.errors).toEqual([
      { productId: 'p_flour', reason: 'no_conversion_path', fromUnitId: 'tbsp', baseUnitId: 'g' },
    ]);
  });

  it('scales totals by the scale factor', () => {
    const r = computeNutrition({
      ingredients: [{ productId: 'p_tomato', quantity: 100, unitId: 'g' }],
      products,
      convert,
      scale: 2.5,
    });
    expect(closeTo(r.nutrition.kcal, 45)).toBe(true);
  });

  it('zero ingredients → all zeros, incomplete=false, no errors', () => {
    const r = computeNutrition({ ingredients: [], products, convert });
    expect(r.nutrition).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
    expect(r.incomplete).toBe(false);
    expect(r.errors).toEqual([]);
  });
});

describe('divideNutrition', () => {
  it('splits per-serving correctly', () => {
    const total = { kcal: 400, protein: 20, fat: 10, carbs: 50 };
    expect(divideNutrition(total, 4)).toEqual({ kcal: 100, protein: 5, fat: 2.5, carbs: 12.5 });
  });

  it('returns zeros on n <= 0', () => {
    const total = { kcal: 100, protein: 5, fat: 2, carbs: 10 };
    expect(divideNutrition(total, 0)).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
    expect(divideNutrition(total, -1)).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
  });
});

describe('addNutrition', () => {
  it('sums field by field', () => {
    expect(
      addNutrition(
        { kcal: 1, protein: 2, fat: 3, carbs: 4 },
        { kcal: 10, protein: 20, fat: 30, carbs: 40 },
      ),
    ).toEqual({ kcal: 11, protein: 22, fat: 33, carbs: 44 });
  });
});
