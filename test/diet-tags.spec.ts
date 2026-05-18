import { describe, expect, it } from 'bun:test';

import {
  findIncompatibleIngredients,
  parseTagsQuery,
  tagsAreCompatible,
} from '../src/diet/diet-tags';

describe('tagsAreCompatible', () => {
  it('empty requirements → always compatible', () => {
    expect(tagsAreCompatible([], [])).toBe(true);
    expect(tagsAreCompatible(['vegan'], [])).toBe(true);
  });

  it('product matches required exactly', () => {
    expect(tagsAreCompatible(['vegan'], ['vegan'])).toBe(true);
  });

  it('product missing one of the required tags', () => {
    expect(tagsAreCompatible(['vegan'], ['vegan', 'gluten_free'])).toBe(false);
  });

  it('product has extra tags but covers required', () => {
    expect(
      tagsAreCompatible(['vegan', 'gluten_free', 'kosher'], ['gluten_free']),
    ).toBe(true);
  });

  it('empty product tags but required non-empty → false', () => {
    expect(tagsAreCompatible([], ['vegan'])).toBe(false);
  });
});

describe('findIncompatibleIngredients', () => {
  const ingredients = [
    { productId: 'p1', name: 'Молоко', tags: ['lactose_free'] },
    { productId: 'p2', name: 'Помидор', tags: ['vegan', 'gluten_free'] },
    { productId: 'p3', name: 'Соль', tags: ['vegan', 'gluten_free'] },
  ];

  it('returns only ingredients that miss any required tag', () => {
    const out = findIncompatibleIngredients(ingredients, ['vegan']);
    expect(out.map((i) => i.productId)).toEqual(['p1']);
  });

  it('preserves order of input', () => {
    const out = findIncompatibleIngredients(
      [
        { productId: 'p2', name: 'Помидор', tags: ['vegan'] },
        { productId: 'p1', name: 'Молоко', tags: ['lactose_free'] },
      ],
      ['vegan'],
    );
    expect(out.map((i) => i.productId)).toEqual(['p1']);
  });

  it('empty requirements → empty incompatible list', () => {
    expect(findIncompatibleIngredients(ingredients, [])).toEqual([]);
  });
});

describe('parseTagsQuery', () => {
  it('splits comma list, trims, lowercases, dedupes', () => {
    expect(parseTagsQuery(' Vegan , gluten_free, vegan ')).toEqual([
      'vegan',
      'gluten_free',
    ]);
  });

  it('empty/undefined → []', () => {
    expect(parseTagsQuery(undefined)).toEqual([]);
    expect(parseTagsQuery('')).toEqual([]);
    expect(parseTagsQuery(',  ,')).toEqual([]);
  });
});
