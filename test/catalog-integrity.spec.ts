/**
 * Static integrity checks over the seed catalog.
 *
 * No DB. Just read the TS data and assert:
 *   - product slugs are unique,
 *   - every product references a known unit,
 *   - aliases are non-empty and not all duplicates,
 *   - every product-specific conversion targets a real product,
 *   - every recipe ingredient targets a real product,
 *   - every recipe ingredient unit is supported.
 */
import { describe, expect, it } from 'bun:test';

import { PRODUCT_CONVERSIONS } from '../prisma/data/conversions';
import {
  DAIRY,
  FRUITS,
  GRAINS,
  PROTEINS,
  SeedProduct,
  VEGETABLES,
} from '../prisma/data/products-fresh';
import { PANTRY, SPICES } from '../prisma/data/products-pantry';
import { RECIPES } from '../prisma/data/recipes';
import { UNITS } from '../prisma/data/units';

const ALL: SeedProduct[] = [
  ...VEGETABLES,
  ...FRUITS,
  ...GRAINS,
  ...PROTEINS,
  ...DAIRY,
  ...SPICES,
  ...PANTRY,
];

const SLUGS = new Set(ALL.map((p) => p.slug));
const UNIT_IDS = new Set(UNITS.map((u) => u.id));

describe('seed catalog: products', () => {
  it('has at least 100 products', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(100);
  });

  it('all slugs are unique', () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    for (const p of ALL) {
      const prev = seen.get(p.slug);
      if (prev) dups.push(`${p.slug}: "${prev}" vs "${p.name}"`);
      else seen.set(p.slug, p.name);
    }
    expect(dups).toEqual([]);
  });

  it('all slugs are kebab-case lowercase', () => {
    const bad = ALL.filter((p) => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(p.slug));
    expect(bad.map((p) => p.slug)).toEqual([]);
  });

  it('every product baseUnitId is a known unit', () => {
    const bad = ALL.filter((p) => !UNIT_IDS.has(p.baseUnitId));
    expect(bad.map((p) => `${p.slug}:${p.baseUnitId}`)).toEqual([]);
  });

  it('every product has a non-empty name and category', () => {
    expect(ALL.filter((p) => !p.name.trim()).map((p) => p.slug)).toEqual([]);
    expect(ALL.filter((p) => !p.category.trim()).map((p) => p.slug)).toEqual([]);
  });

  it('every product has at least one alias and no empty alias strings', () => {
    const noAliases = ALL.filter((p) => p.aliases.length === 0);
    expect(noAliases.map((p) => p.slug)).toEqual([]);

    const emptyAlias = ALL.flatMap((p) =>
      p.aliases.filter((a) => !a.trim()).map(() => p.slug),
    );
    expect(emptyAlias).toEqual([]);
  });

  it('aliases are unique within a single product', () => {
    const offenders: string[] = [];
    for (const p of ALL) {
      const seen = new Set<string>();
      for (const a of p.aliases) {
        const key = a.toLowerCase().trim();
        if (seen.has(key)) offenders.push(`${p.slug}: "${a}"`);
        seen.add(key);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('KBJU values, when present, are non-negative numbers', () => {
    const offenders: string[] = [];
    for (const p of ALL) {
      const fields: Array<[string, number | undefined]> = [
        ['kcal', p.kcalPer100],
        ['protein', p.proteinPer100],
        ['fat', p.fatPer100],
        ['carbs', p.carbsPer100],
      ];
      for (const [field, v] of fields) {
        if (v !== undefined && (Number.isNaN(v) || v < 0)) {
          offenders.push(`${p.slug}.${field}=${v}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('seed catalog: conversions', () => {
  it('every conversion targets a real product', () => {
    const bad = PRODUCT_CONVERSIONS.filter((c) => !SLUGS.has(c.productSlug));
    expect(bad.map((c) => c.productSlug)).toEqual([]);
  });

  it('every conversion uses known units and a positive factor', () => {
    const bad = PRODUCT_CONVERSIONS.filter(
      (c) =>
        !UNIT_IDS.has(c.from) || !UNIT_IDS.has(c.to) || !(c.factor > 0),
    );
    expect(bad).toEqual([]);
  });
});

describe('seed catalog: recipes', () => {
  const VALID_GROUPS = new Set([
    'BREAKFAST',
    'SOUP',
    'MAIN',
    'SALAD',
    'BAKING',
    'DESSERT',
    'DRINK',
  ]);

  it('every recipe has a unique slug', () => {
    const slugs = RECIPES.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every recipe declares a group from the 7-button menu', () => {
    const bad = RECIPES.filter((r) => !VALID_GROUPS.has(r.group));
    expect(bad.map((r) => `${r.slug}:${r.group}`)).toEqual([]);
  });

  it('every navigation group has at least one recipe', () => {
    const present = new Set(RECIPES.map((r) => r.group));
    const missing = [...VALID_GROUPS].filter((g) => !present.has(g as never));
    expect(missing).toEqual([]);
  });

  it('every recipe ingredient references a real product', () => {
    const bad: string[] = [];
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        if (!SLUGS.has(ing.productSlug)) {
          bad.push(`${r.slug} -> ${ing.productSlug}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every recipe ingredient uses a known unit', () => {
    const bad: string[] = [];
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        if (!UNIT_IDS.has(ing.unitId)) {
          bad.push(`${r.slug} -> ${ing.productSlug}: ${ing.unitId}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every recipe ingredient has positive quantity and non-empty rawText', () => {
    const bad: string[] = [];
    for (const r of RECIPES) {
      for (const ing of r.ingredients) {
        if (!(ing.quantity > 0)) bad.push(`${r.slug}/${ing.productSlug}: qty=${ing.quantity}`);
        if (!ing.rawText.trim()) bad.push(`${r.slug}/${ing.productSlug}: empty rawText`);
      }
    }
    expect(bad).toEqual([]);
  });
});
