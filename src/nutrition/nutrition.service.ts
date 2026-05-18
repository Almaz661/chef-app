import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { convertQuantity } from '../units/unit-conversions';
import { UnitConverterService } from '../units/unit-converter.service';

import {
  ComputeNutritionResult,
  Nutrition,
  ProductNutrition,
  addNutrition,
  computeNutrition,
  divideNutrition,
  ZERO_NUTRITION,
} from './nutrition-calc';

interface RecipeNutritionResult {
  recipeId: string;
  servings: number;
  total: Nutrition;
  perServing: Nutrition;
  incomplete: boolean;
  errors: ComputeNutritionResult['errors'];
}

interface MenuRecipeNutrition {
  menuRecipeId: string;
  recipeId: string;
  recipeTitle: string;
  servings: number;
  nutrition: Nutrition;
  incomplete: boolean;
  errors: ComputeNutritionResult['errors'];
}

interface MenuNutritionResult {
  menuId: string;
  total: Nutrition;
  incomplete: boolean;
  byRecipe: MenuRecipeNutrition[];
}

@Injectable()
export class NutritionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly converter: UnitConverterService,
  ) {}

  async forRecipe(recipeId: string): Promise<RecipeNutritionResult> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        id: true,
        servings: true,
        ingredients: { select: { productId: true, quantity: true, unitId: true } },
      },
    });
    if (!recipe) throw new NotFoundException(`recipe ${recipeId} not found`);

    const { nutrition, incomplete, errors } = await this.compute(
      recipe.ingredients.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitId: i.unitId,
      })),
      1,
    );

    const servings = recipe.servings || 1;
    return {
      recipeId: recipe.id,
      servings,
      total: nutrition,
      perServing: divideNutrition(nutrition, servings),
      incomplete,
      errors,
    };
  }

  async forMenu(menuId: string): Promise<MenuNutritionResult> {
    const menu = await this.prisma.menu.findUnique({
      where: { id: menuId },
      select: {
        id: true,
        recipes: {
          select: {
            id: true,
            servings: true,
            recipe: {
              select: {
                id: true,
                title: true,
                servings: true,
                ingredients: { select: { productId: true, quantity: true, unitId: true } },
              },
            },
          },
        },
      },
    });
    if (!menu) throw new NotFoundException(`menu ${menuId} not found`);

    let total: Nutrition = { ...ZERO_NUTRITION };
    let menuIncomplete = false;
    const byRecipe: MenuRecipeNutrition[] = [];

    for (const mr of menu.recipes) {
      const recipeServings = mr.recipe.servings || 1;
      const scale = (mr.servings || recipeServings) / recipeServings;

      const { nutrition, incomplete, errors } = await this.compute(
        mr.recipe.ingredients.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitId: i.unitId,
        })),
        scale,
      );

      byRecipe.push({
        menuRecipeId: mr.id,
        recipeId: mr.recipe.id,
        recipeTitle: mr.recipe.title,
        servings: mr.servings,
        nutrition,
        incomplete,
        errors,
      });

      total = addNutrition(total, nutrition);
      if (incomplete) menuIncomplete = true;
    }

    return {
      menuId: menu.id,
      total,
      incomplete: menuIncomplete,
      byRecipe,
    };
  }

  // ---------- internals ----------

  private async compute(
    ingredients: Array<{ productId: string; quantity: number; unitId: string }>,
    scale: number,
  ): Promise<ComputeNutritionResult> {
    if (ingredients.length === 0) {
      return { nutrition: { ...ZERO_NUTRITION }, incomplete: false, errors: [] };
    }

    const productIds = [...new Set(ingredients.map((i) => i.productId))];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        baseUnitId: true,
        kcalPer100: true,
        proteinPer100: true,
        fatPer100: true,
        carbsPer100: true,
      },
    });
    const productMap = new Map<string, ProductNutrition>(
      products.map((p) => [
        p.id,
        {
          baseUnitId: p.baseUnitId,
          kcalPer100: p.kcalPer100 ?? null,
          proteinPer100: p.proteinPer100 ?? null,
          fatPer100: p.fatPer100 ?? null,
          carbsPer100: p.carbsPer100 ?? null,
        },
      ]),
    );

    const dict = await this.converter.loadDictionary(productIds);
    const convert = (qty: number, from: string, to: string, productId: string): number | null =>
      convertQuantity(dict, qty, from, to, productId);

    return computeNutrition({
      ingredients,
      products: productMap,
      convert,
      scale,
    });
  }
}
