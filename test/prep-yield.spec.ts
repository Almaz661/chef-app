import { describe, expect, it } from 'bun:test';

import {
  classifyPrepFields,
  computePrepYield,
  PrepYieldInput,
} from '../src/cooking/prep-yield';

const NOW = new Date('2026-05-18T12:00:00Z');

const baseInput: PrepYieldInput = {
  producesProductId: 'p_chicken_broth',
  prepYieldQuantity: 1500,
  prepYieldUnitId: 'ml',
  prepDefaultLocation: 'FREEZER',
  prepShelfLifeDays: 90,
  scale: 1,
  now: NOW,
};

describe('computePrepYield', () => {
  it('passes through scale=1 unchanged', () => {
    const r = computePrepYield(baseInput);
    expect(r.productId).toBe('p_chicken_broth');
    expect(r.quantity).toBe(1500);
    expect(r.unitId).toBe('ml');
    expect(r.location).toBe('FREEZER');
    expect(r.acquiredAt.getTime()).toBe(NOW.getTime());
  });

  it('multiplies yield by scale (2x portions)', () => {
    const r = computePrepYield({ ...baseInput, scale: 2 });
    expect(r.quantity).toBe(3000);
  });

  it('halves yield for scale=0.5', () => {
    const r = computePrepYield({ ...baseInput, scale: 0.5 });
    expect(r.quantity).toBe(750);
  });

  it('expiresAt = now + prepShelfLifeDays * 24h', () => {
    const r = computePrepYield(baseInput); // 90 days
    const expected = NOW.getTime() + 90 * 24 * 60 * 60 * 1000;
    expect(r.expiresAt.getTime()).toBe(expected);
  });

  it('30-day dough goes 30 days into the future', () => {
    const r = computePrepYield({
      ...baseInput,
      producesProductId: 'p_dough',
      prepYieldQuantity: 500,
      prepYieldUnitId: 'g',
      prepDefaultLocation: 'FRIDGE',
      prepShelfLifeDays: 30,
    });
    const expected = NOW.getTime() + 30 * 24 * 60 * 60 * 1000;
    expect(r.expiresAt.getTime()).toBe(expected);
    expect(r.location).toBe('FRIDGE');
  });

  it('passes FREEZER through verbatim', () => {
    const r = computePrepYield({ ...baseInput, prepDefaultLocation: 'FREEZER' });
    expect(r.location).toBe('FREEZER');
  });

  it('rejects yield <= 0', () => {
    expect(() => computePrepYield({ ...baseInput, prepYieldQuantity: 0 })).toThrow();
    expect(() => computePrepYield({ ...baseInput, prepYieldQuantity: -10 })).toThrow();
  });

  it('rejects shelfLife <= 0', () => {
    expect(() => computePrepYield({ ...baseInput, prepShelfLifeDays: 0 })).toThrow();
    expect(() => computePrepYield({ ...baseInput, prepShelfLifeDays: -1 })).toThrow();
  });

  it('rejects scale <= 0', () => {
    expect(() => computePrepYield({ ...baseInput, scale: 0 })).toThrow();
    expect(() => computePrepYield({ ...baseInput, scale: -1 })).toThrow();
  });

  it('rejects unknown location', () => {
    expect(() =>
      computePrepYield({ ...baseInput, prepDefaultLocation: 'PANTRY' as never }),
    ).toThrow();
  });

  it('does not mutate the input.now', () => {
    const now = new Date(NOW.getTime());
    const r = computePrepYield({ ...baseInput, now });
    // acquiredAt is a separate Date instance
    expect(r.acquiredAt).not.toBe(now);
    expect(r.expiresAt).not.toBe(now);
    expect(now.getTime()).toBe(NOW.getTime());
  });
});

describe('classifyPrepFields', () => {
  const FULL = {
    producesProductId: 'p1',
    prepYieldQuantity: 1500,
    prepYieldUnitId: 'ml',
    prepDefaultLocation: 'FREEZER',
    prepShelfLifeDays: 90,
  };
  const EMPTY = {
    producesProductId: null,
    prepYieldQuantity: null,
    prepYieldUnitId: null,
    prepDefaultLocation: null,
    prepShelfLifeDays: null,
  };

  it('all five filled → prep', () => {
    expect(classifyPrepFields(FULL)).toBe('prep');
  });

  it('all five null → regular', () => {
    expect(classifyPrepFields(EMPTY)).toBe('regular');
  });

  it('all five undefined → regular', () => {
    expect(
      classifyPrepFields({
        producesProductId: undefined,
        prepYieldQuantity: undefined,
        prepYieldUnitId: undefined,
        prepDefaultLocation: undefined,
        prepShelfLifeDays: undefined,
      }),
    ).toBe('regular');
  });

  it('only producesProductId set → partial', () => {
    expect(classifyPrepFields({ ...EMPTY, producesProductId: 'p1' })).toBe('partial');
  });

  it('four filled, one missing → partial', () => {
    expect(classifyPrepFields({ ...FULL, prepShelfLifeDays: null })).toBe('partial');
  });
});
