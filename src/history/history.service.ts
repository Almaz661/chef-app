import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTxnSource, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import {
  ConsumedItem,
  ProductInfo,
  RawTxn,
  formatConsumed,
} from './cooking-history';
import { ListHistoryDto } from './dto/list-history.dto';

const DEFAULT_LIMIT = 50;
const MAX_STATS_TOP = 5;
const DEFAULT_STATS_DAYS = 30;

export interface CookEvent {
  menuRecipeId: string;
  menuId: string;
  menuName: string;
  recipeId: string;
  recipeSlug: string;
  recipeTitle: string;
  recipeServings: number;
  cookedServings: number;
  cookedAt: Date;
  consumed: ConsumedItem[];
}

export interface ListResult {
  items: CookEvent[];
  total: number;
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(filter: ListHistoryDto): Promise<ListResult> {
    const where: Prisma.MenuRecipeWhereInput = {
      cookedAt: {
        not: null,
        ...(filter.from ? { gte: new Date(filter.from) } : {}),
        ...(filter.to ? { lte: new Date(filter.to) } : {}),
      },
      ...(filter.recipeId ? { recipeId: filter.recipeId } : {}),
      ...(filter.menuId ? { menuId: filter.menuId } : {}),
    };

    const limit = filter.limit ?? DEFAULT_LIMIT;
    const offset = filter.offset ?? 0;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.menuRecipe.findMany({
        where,
        orderBy: { cookedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          menu: { select: { id: true, name: true } },
          recipe: {
            select: { id: true, slug: true, title: true, servings: true },
          },
        },
      }),
      this.prisma.menuRecipe.count({ where }),
    ]);

    if (rows.length === 0) {
      return { items: [], total };
    }

    // Bulk-load consumption txns + product names in two queries.
    const menuRecipeIds = rows.map((r) => r.id);
    const txns = await this.prisma.inventoryTxn.findMany({
      where: {
        source: InventoryTxnSource.CONSUMPTION,
        refType: 'MenuRecipe',
        refId: { in: menuRecipeIds },
      },
      select: { refId: true, productId: true, quantity: true, unitId: true },
    });

    const productIds = [...new Set(txns.map((t) => t.productId))];
    const productRows = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : [];
    const productMap = new Map<string, ProductInfo>(
      productRows.map((p) => [p.id, { id: p.id, name: p.name }]),
    );

    const txnsByMenuRecipe = new Map<string, RawTxn[]>();
    for (const t of txns) {
      if (!t.refId) continue;
      const list = txnsByMenuRecipe.get(t.refId) ?? [];
      list.push({
        productId: t.productId,
        quantity: Number(t.quantity),
        unitId: t.unitId,
      });
      txnsByMenuRecipe.set(t.refId, list);
    }

    const items: CookEvent[] = rows.map((mr) => ({
      menuRecipeId: mr.id,
      menuId: mr.menuId,
      menuName: mr.menu.name,
      recipeId: mr.recipe.id,
      recipeSlug: mr.recipe.slug,
      recipeTitle: mr.recipe.title,
      recipeServings: mr.recipe.servings,
      cookedServings: mr.servings,
      // The where-clause guarantees cookedAt is non-null here.
      cookedAt: mr.cookedAt as Date,
      consumed: formatConsumed(txnsByMenuRecipe.get(mr.id) ?? [], productMap),
    }));

    return { items, total };
  }

  async forRecipe(recipeId: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true, slug: true, title: true },
    });
    if (!recipe) {
      throw new NotFoundException(`recipe ${recipeId} not found`);
    }

    const { items } = await this.listEvents({ recipeId, limit: 200 });

    return {
      recipe,
      timesCooked: items.length,
      lastCookedAt: items[0]?.cookedAt ?? null,
      items,
    };
  }

  async stats(days = DEFAULT_STATS_DAYS) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where: Prisma.MenuRecipeWhereInput = {
      cookedAt: { gte: since },
    };

    const [totalCooks, grouped] = await this.prisma.$transaction([
      this.prisma.menuRecipe.count({ where }),
      this.prisma.menuRecipe.groupBy({
        by: ['recipeId'],
        where,
        _count: { recipeId: true },
        _max: { cookedAt: true },
        orderBy: [
          { _count: { recipeId: 'desc' } },
          { _max: { cookedAt: 'desc' } },
        ],
        take: MAX_STATS_TOP,
      }),
    ]);

    // distinctRecipes is exact only when grouped.length < TOP; otherwise we
    // run a second cheap count. Acceptable for Phase 5.
    const distinctRecipes =
      grouped.length < MAX_STATS_TOP
        ? grouped.length
        : (
            await this.prisma.menuRecipe.findMany({
              where,
              distinct: ['recipeId'],
              select: { recipeId: true },
            })
          ).length;

    const recipeIds = grouped.map((g) => g.recipeId);
    const recipes = recipeIds.length
      ? await this.prisma.recipe.findMany({
          where: { id: { in: recipeIds } },
          select: { id: true, title: true },
        })
      : [];
    const titleMap = new Map(recipes.map((r) => [r.id, r.title]));

    return {
      days,
      totalCooks,
      distinctRecipes,
      topRecipes: grouped.map((g) => ({
        recipeId: g.recipeId,
        recipeTitle: titleMap.get(g.recipeId) ?? '(deleted)',
        count: (g._count as any).recipeId,
        lastCookedAt: (g._max as any).cookedAt as Date,
      })),
    };
  }
}
