import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryLocation, InventoryTxnSource, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { convertQuantity } from '../units/unit-conversions';
import { UnitConverterService } from '../units/unit-converter.service';

import {
  Loc,
  Need,
  StockEntry,
  planConsumption,
} from './cooking-planner';
import { CookDto } from './dto/cook.dto';

const FALLBACK_ORDER: readonly Loc[] = ['PANTRY', 'FRIDGE', 'FREEZER'];

@Injectable()
export class CookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly converter: UnitConverterService,
  ) {}

  /**
   * Mark a MenuRecipe as cooked. All side effects happen inside ONE
   * prisma.$transaction:
   *   - decrement InventoryItem rows according to the plan
   *   - emit a negative-quantity InventoryTxn per (product, location)
   *   - set MenuRecipe.cookedAt
   * If anything fails (insufficient stock, missing conversion, db error),
   * the entire transaction rolls back. There is no partial-consumed state.
   */
  async cook(menuRecipeId: string, dto: CookDto) {
    return this.prisma.$transaction(async (tx) => {
      const mr = await tx.menuRecipe.findUnique({
        where: { id: menuRecipeId },
        include: {
          recipe: {
            select: {
              id: true,
              servings: true,
              ingredients: {
                select: { productId: true, quantity: true, unitId: true },
              },
            },
          },
        },
      });
      if (!mr) throw new NotFoundException(`menu_recipe ${menuRecipeId} not found`);
      if (mr.cookedAt) {
        throw new ConflictException('this menu recipe is already cooked');
      }

      const recipeServings = mr.recipe.servings || 1;
      const scale = (mr.servings || recipeServings) / recipeServings;

      // 1) build needs in base unit
      const productIds = [...new Set(mr.recipe.ingredients.map((i) => i.productId))];
      if (productIds.length === 0) {
        // Recipe has no ingredients — just mark cooked.
        await tx.menuRecipe.update({
          where: { id: menuRecipeId },
          data: { cookedAt: new Date() },
        });
        return { menuRecipeId, cookedAt: new Date(), consumed: [] };
      }

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, baseUnitId: true },
      });
      const baseUnit = new Map(products.map((p) => [p.id, p.baseUnitId]));
      const dict = await this.converter.loadDictionary(productIds, tx);

      const needs: Need[] = [];
      for (const ing of mr.recipe.ingredients) {
        const bu = baseUnit.get(ing.productId);
        if (!bu) {
          throw new BadRequestException(
            `cook: product ${ing.productId} has no baseUnit (data integrity)`,
          );
        }
        const qty = Number(ing.quantity) * scale;
        const baseQty =
          ing.unitId === bu ? qty : convertQuantity(dict, qty, ing.unitId, bu, ing.productId);
        if (baseQty === null) {
          throw new BadRequestException(
            `cook: cannot convert ${ing.unitId} -> ${bu} for product ${ing.productId}`,
          );
        }
        needs.push({ productId: ing.productId, quantity: baseQty, baseUnitId: bu });
      }

      // 2) load stock by product+location
      const items = await tx.inventoryItem.findMany({
        where: { productId: { in: productIds } },
        select: { productId: true, location: true, quantity: true },
      });
      const stock = new Map<string, StockEntry[]>();
      for (const it of items) {
        const list = stock.get(it.productId) ?? [];
        list.push({ location: it.location as Loc, quantity: Number(it.quantity) });
        stock.set(it.productId, list);
      }

      // 3) plan
      const plan = planConsumption({
        needs,
        stock,
        preferLocation: dto.preferLocation as Loc | undefined,
        fallbackOrder: FALLBACK_ORDER,
      });

      if (!plan.ok) {
        // 422 carries the structured shortages so the client can show them.
        throw new HttpException(
          {
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            message: 'insufficient inventory to cook this recipe',
            shortages: plan.shortages,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // 4) apply: decrement inventory + write CONSUMPTION txns
      const consumed: Array<{
        productId: string;
        baseUnitId: string;
        quantity: number;
        fromLocations: { location: Loc; quantity: number }[];
      }> = [];

      for (const line of plan.lines) {
        for (const take of line.takeFrom) {
          await tx.inventoryItem.update({
            where: {
              productId_location: {
                productId: line.productId,
                location: take.location as InventoryLocation,
              },
            },
            data: { quantity: { decrement: take.quantity } },
          });
          await tx.inventoryTxn.create({
            data: {
              productId: line.productId,
              quantity: -take.quantity,
              unitId: line.baseUnitId,
              source: InventoryTxnSource.CONSUMPTION,
              refType: 'MenuRecipe',
              refId: menuRecipeId,
            },
          });
        }
        consumed.push({
          productId: line.productId,
          baseUnitId: line.baseUnitId,
          quantity: line.quantity,
          fromLocations: line.takeFrom,
        });
      }

      const cookedAt = new Date();
      await tx.menuRecipe.update({
        where: { id: menuRecipeId },
        data: { cookedAt },
      });

      return { menuRecipeId, cookedAt, consumed };
    });
  }
}

// Re-export Prisma type so callers don't have to import it just for this.
export type Tx = Prisma.TransactionClient;
