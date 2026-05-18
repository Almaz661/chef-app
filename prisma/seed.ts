/* eslint-disable no-console */
import { PrismaClient, UnitKind } from '@prisma/client';

import { normalizeText } from '../src/matching/text-normalize';

import { PRODUCT_CONVERSIONS } from './data/conversions';
import { DAIRY, FRUITS, GRAINS, PROTEINS, VEGETABLES } from './data/products-fresh';
import { PANTRY, SPICES } from './data/products-pantry';
import { RECIPES } from './data/recipes';
import { GLOBAL_CONVERSIONS, UNITS, UnitKindLiteral } from './data/units';
import type { SeedProduct } from './data/products-fresh';

const prisma = new PrismaClient();

const ALL_PRODUCTS: SeedProduct[] = [
  ...VEGETABLES,
  ...FRUITS,
  ...GRAINS,
  ...PROTEINS,
  ...DAIRY,
  ...SPICES,
  ...PANTRY,
];

// Detect duplicate slugs at startup so two files don't silently fight each
// other (e.g. tomato listed both in fresh and pantry).
function assertNoDuplicateSlugs(): void {
  const seen = new Map<string, string>();
  for (const p of ALL_PRODUCTS) {
    const prev = seen.get(p.slug);
    if (prev) {
      throw new Error(`duplicate product slug "${p.slug}" (named "${p.name}" and "${prev}")`);
    }
    seen.set(p.slug, p.name);
  }
}

const KIND_MAP: Record<UnitKindLiteral, UnitKind> = {
  MASS: UnitKind.MASS,
  VOLUME: UnitKind.VOLUME,
  COUNT: UnitKind.COUNT,
  OTHER: UnitKind.OTHER,
};

async function seedUnits(): Promise<void> {
  for (const u of UNITS) {
    const kind = KIND_MAP[u.kind];
    await prisma.unit.upsert({
      where: { id: u.id },
      update: { name: u.name, kind },
      create: { id: u.id, name: u.name, kind },
    });
  }
}

async function seedGlobalConversions(): Promise<void> {
  for (const c of GLOBAL_CONVERSIONS) {
    // null in a unique tuple isn't usable in upsert — emulate it.
    const existing = await prisma.unitConversion.findFirst({
      where: { productId: null, fromUnitId: c.from, toUnitId: c.to },
    });
    if (existing) {
      await prisma.unitConversion.update({
        where: { id: existing.id },
        data: { factor: c.factor },
      });
    } else {
      await prisma.unitConversion.create({
        data: { fromUnitId: c.from, toUnitId: c.to, factor: c.factor },
      });
    }
  }
}

async function seedProducts(): Promise<void> {
  for (const p of ALL_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        category: p.category,
        baseUnitId: p.baseUnitId,
        kcalPer100: p.kcalPer100,
        proteinPer100: p.proteinPer100,
        fatPer100: p.fatPer100,
        carbsPer100: p.carbsPer100,
        tags: p.tags ?? [],
      },
      create: {
        slug: p.slug,
        name: p.name,
        category: p.category,
        baseUnitId: p.baseUnitId,
        kcalPer100: p.kcalPer100,
        proteinPer100: p.proteinPer100,
        fatPer100: p.fatPer100,
        carbsPer100: p.carbsPer100,
        tags: p.tags ?? [],
      },
    });

    // The product name itself + every alias becomes a ProductAlias row,
    // so the matcher finds it both ways.
    const aliasTexts = [p.name, ...p.aliases];
    for (const alias of aliasTexts) {
      const normalized = normalizeText(alias);
      if (!normalized) continue;
      await prisma.productAlias.upsert({
        where: { normalizedText_locale: { normalizedText: normalized, locale: 'ru' } },
        update: { productId: product.id, text: alias },
        create: {
          productId: product.id,
          text: alias,
          normalizedText: normalized,
          locale: 'ru',
        },
      });
    }
  }
}

async function seedProductConversions(): Promise<void> {
  for (const c of PRODUCT_CONVERSIONS) {
    const product = await prisma.product.findUnique({ where: { slug: c.productSlug } });
    if (!product) {
      console.warn(`[seed] conversion skipped: product "${c.productSlug}" not found`);
      continue;
    }
    await prisma.unitConversion.upsert({
      where: {
        productId_fromUnitId_toUnitId: {
          productId: product.id,
          fromUnitId: c.from,
          toUnitId: c.to,
        },
      },
      update: { factor: c.factor },
      create: {
        productId: product.id,
        fromUnitId: c.from,
        toUnitId: c.to,
        factor: c.factor,
      },
    });
  }
}

async function seedRecipes(): Promise<void> {
  for (const r of RECIPES) {
    const recipe = await prisma.recipe.upsert({
      where: { slug: r.slug },
      update: {
        title: r.title,
        description: r.description,
        servings: r.servings,
        group: r.group,
      },
      create: {
        slug: r.slug,
        title: r.title,
        description: r.description,
        servings: r.servings,
        group: r.group,
      },
    });

    // Replace ingredients deterministically so re-running seed is safe.
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });

    const data = [];
    for (let i = 0; i < r.ingredients.length; i++) {
      const ing = r.ingredients[i];
      const product = await prisma.product.findUnique({
        where: { slug: ing.productSlug },
        select: { id: true },
      });
      if (!product) {
        throw new Error(
          `recipe "${r.slug}" references missing product "${ing.productSlug}"`,
        );
      }
      data.push({
        recipeId: recipe.id,
        productId: product.id,
        quantity: ing.quantity,
        unitId: ing.unitId,
        rawText: ing.rawText,
        position: i,
      });
    }

    if (data.length > 0) {
      await prisma.recipeIngredient.createMany({ data });
    }
  }
}

async function main(): Promise<void> {
  assertNoDuplicateSlugs();

  console.log(`[seed] units... (${UNITS.length})`);
  await seedUnits();

  console.log(`[seed] global unit conversions... (${GLOBAL_CONVERSIONS.length})`);
  await seedGlobalConversions();

  console.log(`[seed] products & aliases... (${ALL_PRODUCTS.length} products)`);
  await seedProducts();

  console.log(`[seed] product-specific conversions... (${PRODUCT_CONVERSIONS.length})`);
  await seedProductConversions();

  console.log(`[seed] recipes... (${RECIPES.length})`);
  await seedRecipes();

  console.log('[seed] done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
