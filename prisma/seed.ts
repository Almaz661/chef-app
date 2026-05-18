/* eslint-disable no-console */
import { PrismaClient, UnitKind } from '@prisma/client';

import { normalizeText } from '../src/matching/text-normalize';

const prisma = new PrismaClient();

interface SeedProduct {
  slug: string;
  name: string;
  category: string;
  baseUnitId: string;
  aliases: string[];
  kcalPer100?: number;
  proteinPer100?: number;
  fatPer100?: number;
  carbsPer100?: number;
  tags?: string[];
}

const UNITS: Array<{ id: string; name: string; kind: UnitKind }> = [
  { id: 'g', name: 'грамм', kind: UnitKind.MASS },
  { id: 'kg', name: 'килограмм', kind: UnitKind.MASS },
  { id: 'ml', name: 'миллилитр', kind: UnitKind.VOLUME },
  { id: 'l', name: 'литр', kind: UnitKind.VOLUME },
  { id: 'tbsp', name: 'столовая ложка', kind: UnitKind.VOLUME },
  { id: 'tsp', name: 'чайная ложка', kind: UnitKind.VOLUME },
  { id: 'pcs', name: 'штука', kind: UnitKind.COUNT },
  { id: 'pinch', name: 'щепотка', kind: UnitKind.OTHER },
];

// Global conversions (independent of product).
const GLOBAL_CONVERSIONS: Array<{ from: string; to: string; factor: number }> = [
  { from: 'kg', to: 'g', factor: 1000 },
  { from: 'g', to: 'kg', factor: 0.001 },
  { from: 'l', to: 'ml', factor: 1000 },
  { from: 'ml', to: 'l', factor: 0.001 },
];

const PRODUCTS: SeedProduct[] = [
  {
    slug: 'salt',
    name: 'Соль',
    category: 'Приправы',
    baseUnitId: 'g',
    aliases: ['соль', 'поваренная соль', 'соль поваренная'],
    kcalPer100: 0,
    tags: ['vegan', 'gluten_free'],
  },
  {
    slug: 'flour-wheat',
    name: 'Мука пшеничная',
    category: 'Бакалея',
    baseUnitId: 'g',
    aliases: ['мука', 'мука пшеничная', 'пшеничная мука'],
    kcalPer100: 364,
    proteinPer100: 10.3,
    fatPer100: 1.1,
    carbsPer100: 76,
    tags: ['vegan'],
  },
  {
    slug: 'olive-oil',
    name: 'Масло оливковое',
    category: 'Масла',
    baseUnitId: 'ml',
    aliases: ['оливковое масло', 'масло оливковое', 'extra virgin olive oil'],
    kcalPer100: 884,
    proteinPer100: 0,
    fatPer100: 100,
    carbsPer100: 0,
    tags: ['vegan', 'gluten_free'],
  },
  {
    slug: 'tomato',
    name: 'Помидор',
    category: 'Овощи',
    baseUnitId: 'g',
    aliases: ['помидор', 'помидоры', 'томат', 'томаты'],
    kcalPer100: 18,
    proteinPer100: 0.9,
    fatPer100: 0.2,
    carbsPer100: 3.9,
    tags: ['vegan', 'gluten_free'],
  },
];

// Product-specific conversions (e.g. 1 ст.л. муки ≈ 25 г).
const PRODUCT_CONVERSIONS: Array<{
  productSlug: string;
  from: string;
  to: string;
  factor: number;
}> = [
  { productSlug: 'flour-wheat', from: 'tbsp', to: 'g', factor: 25 },
  { productSlug: 'flour-wheat', from: 'tsp', to: 'g', factor: 8 },
  { productSlug: 'olive-oil', from: 'tbsp', to: 'ml', factor: 15 },
  { productSlug: 'olive-oil', from: 'tsp', to: 'ml', factor: 5 },
  { productSlug: 'salt', from: 'tsp', to: 'g', factor: 5 },
  { productSlug: 'salt', from: 'pinch', to: 'g', factor: 0.4 },
];

async function seedUnits(): Promise<void> {
  for (const u of UNITS) {
    await prisma.unit.upsert({
      where: { id: u.id },
      update: { name: u.name, kind: u.kind },
      create: u,
    });
  }
}

async function seedGlobalConversions(): Promise<void> {
  for (const c of GLOBAL_CONVERSIONS) {
    // We can't put `null` in a unique tuple in upsert, so check + create.
    const existing = await prisma.unitConversion.findFirst({
      where: { productId: null, fromUnitId: c.from, toUnitId: c.to },
    });
    if (!existing) {
      await prisma.unitConversion.create({
        data: { fromUnitId: c.from, toUnitId: c.to, factor: c.factor },
      });
    }
  }
}

async function seedProducts(): Promise<void> {
  for (const p of PRODUCTS) {
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

    for (const alias of p.aliases) {
      const normalized = normalizeText(alias);
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
    if (!product) continue;
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

async function seedDemoRecipe(): Promise<void> {
  // Look up products we need.
  const tomato = await prisma.product.findUniqueOrThrow({ where: { slug: 'tomato' } });
  const oliveOil = await prisma.product.findUniqueOrThrow({ where: { slug: 'olive-oil' } });
  const salt = await prisma.product.findUniqueOrThrow({ where: { slug: 'salt' } });

  const recipe = await prisma.recipe.upsert({
    where: { slug: 'simple-tomato-salad' },
    update: {
      title: 'Простой томатный салат',
      description: 'Минималистичный салат: помидоры, оливковое масло, соль.',
      servings: 2,
    },
    create: {
      slug: 'simple-tomato-salad',
      title: 'Простой томатный салат',
      description: 'Минималистичный салат: помидоры, оливковое масло, соль.',
      servings: 2,
    },
  });

  // Replace ingredients deterministically so re-running seed is safe.
  await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });

  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipeId: recipe.id,
        productId: tomato.id,
        quantity: 300,
        unitId: 'g',
        rawText: '300 г помидоров',
        position: 0,
      },
      {
        recipeId: recipe.id,
        productId: oliveOil.id,
        quantity: 2,
        unitId: 'tbsp',
        rawText: '2 ст.л. оливкового масла',
        position: 1,
      },
      {
        recipeId: recipe.id,
        productId: salt.id,
        quantity: 1,
        unitId: 'pinch',
        rawText: 'щепотка соли',
        position: 2,
      },
    ],
  });
}

async function main(): Promise<void> {
  console.log('[seed] units…');
  await seedUnits();
  console.log('[seed] global unit conversions…');
  await seedGlobalConversions();
  console.log('[seed] products & aliases…');
  await seedProducts();
  console.log('[seed] product-specific conversions…');
  await seedProductConversions();
  console.log('[seed] demo recipe…');
  await seedDemoRecipe();
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
