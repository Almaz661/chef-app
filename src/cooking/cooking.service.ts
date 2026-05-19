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

import { Batch, Loc, Need, pickBatches } from './cooking-planner';
import { CookDto } from './dto/cook.dto';
import {
  classifyPrepFields,
  computePrepYield,
  PrepLocation,
} from './prep-yield';

const FALLBACK_ORDER: readonly Loc[] = ['PANTRY', 'FRIDGE', 'FREEZER'];
const EPS = 1e-9;

interface ProducedBatch {
  productId: string;
  inventoryItemId: string;
  quantity: number;
  unitId: string;
  location: PrepLocation;
  expiresAt: Date;
}

@Injectable()
export class CookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly converter: UnitConverterService,
  ) {}

  /**
   * Mark a MenuRecipe as cooked. Phase 4 update: drains inventory by
   * FEFO across batches (`pickBatches`), deletes empty batches, writes
   * one InventoryTxn per product. Whole thing inside one $transaction.
   *
   * Phase 6.7 update: if the recipe is a PREP recipe (all five
   * `producesProductId` / `prepYield*` / `prepDefaultLocation` /
   * `prepShelfLifeDays` fields are non-null), additionally creates a
   * fresh InventoryItem batch of the produced semi-finished product
   * with `expiresAt = now + prepShelfLifeDays`, plus a
   * `PREP_PRODUCTION` InventoryTxn for history. All in the same
   * transaction.
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
              producesProductId: true,
              prepYieldQuantity: true,
              prepYieldUnitId: true,
              prepDefaultLocation: true,
              prepShelfLifeDays: true,
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

      // Phase 6.7: validate the all-or-nothing PREP invariant before doing
      // any work. A "partial" recipe is a data integrity bug.
      const prepKind = classifyPrepFields({
        producesProductId: mr.recipe.producesProductId,
        prepYieldQuantity:
          mr.recipe.prepYieldQuantity != null ? Number(mr.recipe.prepYieldQuantity) : null,
        prepYieldUnitId: mr.recipe.prepYieldUnitId,
        prepDefaultLocation: mr.recipe.prepDefaultLocation,
        prepShelfLifeDays: mr.recipe.prepShelfLifeDays,
      });
      if (prepKind === 'partial') {
        throw new BadRequestException(
          `recipe ${mr.recipe.id} has partially-filled prep fields; ` +
            'all of producesProductId / prepYieldQuantity / prepYieldUnitId / ' +
            'prepDefaultLocation / prepShelfLifeDays must be set together',
        );
      }

      const recipeServings = mr.recipe.servings || 1;
      const scale = (mr.servings || recipeServings) / recipeServings;

      const productIds = [...new Set(mr.recipe.ingredients.map((i) => i.productId))];

      // Edge: PREP recipe with no ingredients still needs to produce a batch.
      if (productIds.length === 0 && prepKind !== 'prep') {
        await tx.menuRecipe.update({
          where: { id: menuRecipeId },
          data: { cookedAt: new Date() },
        });
        return { menuRecipeId, cookedAt: new Date(), consumed: [] };
      }

      // 1) build needs in base unit
      let dict: Awaited<ReturnType<UnitConverterService['loadDictionary']>> | null = null;
      const needs: Need[] = [];
      if (productIds.length > 0) {
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, baseUnitId: true },
        });
        const baseUnit = new Map(products.map((p) => [p.id, p.baseUnitId]));
        dict = await this.converter.loadDictionary(productIds, tx);

        for (const ing of mr.recipe.ingredients) {
          const bu = baseUnit.get(ing.productId);
          if (!bu) {
            throw new BadRequestException(
              `cook: product ${ing.productId} has no baseUnit (data integrity)`,
            );
          }
          const qty = Number(ing.quantity) * scale;
          const baseQty =
            ing.unitId === bu
              ? qty
              : convertQuantity(dict, qty, ing.unitId, bu, ing.productId);
          if (baseQty === null) {
            throw new BadRequestException(
              `cook: cannot convert ${ing.unitId} -> ${bu} for product ${ing.productId}`,
            );
          }
          needs.push({ productId: ing.productId, quantity: baseQty, baseUnitId: bu });
        }
      }

      // 2) load all batches for needed products
      const items = productIds.length
        ? await tx.inventoryItem.findMany({
            where: { productId: { in: productIds } },
            select: {
              id: true,
              productId: true,
              location: true,
              quantity: true,
              expiresAt: true,
              acquiredAt: true,
            },
          })
        : [];
      const batches = new Map<string, Batch[]>();
      for (const it of items) {
        const list = batches.get(it.productId) ?? [];
        list.push({
          id: it.id,
          productId: it.productId,
          location: it.location as Loc,
          quantity: Number(it.quantity),
          expiresAt: it.expiresAt,
          acquiredAt: it.acquiredAt,
        });
        batches.set(it.productId, list);
      }

      // 3) plan via FEFO
      const plan = pickBatches({
        needs,
        batches,
        preferLocation: dto.preferLocation as Loc | undefined,
        fallbackOrder: FALLBACK_ORDER,
        now: new Date(),
      });

      if (!plan.ok) {
        throw new HttpException(
          {
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            message: 'insufficient inventory to cook this recipe',
            shortages: plan.shortages,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // 4) apply: drain batches (delete on zero), one CONSUMPTION txn per product
      const consumed: Array<{
        productId: string;
        baseUnitId: string;
        quantity: number;
        fromBatches: Array<{
          batchId: string;
          location: Loc;
          quantity: number;
          expired: boolean;
        }>;
      }> = [];

      for (const line of plan.lines) {
        for (const take of line.takes) {
          const row = await tx.inventoryItem.findUnique({
            where: { id: take.batchId },
            select: { quantity: true },
          });
          if (!row) {
            throw new BadRequestException(
              `cook: batch ${take.batchId} disappeared mid-transaction`,
            );
          }
          const next = Number(row.quantity) - take.quantity;
          if (next <= EPS) {
            await tx.inventoryItem.delete({ where: { id: take.batchId } });
          } else {
            await tx.inventoryItem.update({
              where: { id: take.batchId },
              data: { quantity: next },
            });
          }
        }

        await tx.inventoryTxn.create({
          data: {
            productId: line.productId,
            quantity: -line.quantity,
            unitId: line.baseUnitId,
            source: InventoryTxnSource.CONSUMPTION,
            refType: 'MenuRecipe',
            refId: menuRecipeId,
          },
        });

        consumed.push({
          productId: line.productId,
          baseUnitId: line.baseUnitId,
          quantity: line.quantity,
          fromBatches: line.takes.map((t) => ({
            batchId: t.batchId,
            location: t.location,
            quantity: t.quantity,
            expired: t.expired,
          })),
        });
      }

      const cookedAt = new Date();

      // 5) Phase 6.7: PREP-recipe → produce a new inventory batch + txn.
      let produced: ProducedBatch | undefined;
      if (prepKind === 'prep') {
        const yieldOut = computePrepYield({
          producesProductId: mr.recipe.producesProductId as string,
          prepYieldQuantity: Number(mr.recipe.prepYieldQuantity),
          prepYieldUnitId: mr.recipe.prepYieldUnitId as string,
          prepDefaultLocation: mr.recipe.prepDefaultLocation as PrepLocation,
          prepShelfLifeDays: mr.recipe.prepShelfLifeDays as number,
          scale,
          now: cookedAt,
        });

        const created = await tx.inventoryItem.create({
          data: {
            productId: yieldOut.productId,
            quantity: yieldOut.quantity,
            unitId: yieldOut.unitId,
            location: yieldOut.location as InventoryLocation,
            expiresAt: yieldOut.expiresAt,
            acquiredAt: yieldOut.acquiredAt,
          },
          select: { id: true },
        });

        await tx.inventoryTxn.create({
          data: {
            productId: yieldOut.productId,
            quantity: yieldOut.quantity,
            unitId: yieldOut.unitId,
            source: InventoryTxnSource.PREP_PRODUCTION,
            refType: 'MenuRecipe',
            refId: menuRecipeId,
          },
        });

        produced = {
          productId: yieldOut.productId,
          inventoryItemId: created.id,
          quantity: yieldOut.quantity,
          unitId: yieldOut.unitId,
          location: yieldOut.location,
          expiresAt: yieldOut.expiresAt,
        };
      }

      await tx.menuRecipe.update({
        where: { id: menuRecipeId },
        data: { cookedAt },
      });

      const response: {
        menuRecipeId: string;
        cookedAt: Date;
        consumed: typeof consumed;
        produced?: ProducedBatch;
      } = { menuRecipeId, cookedAt, consumed };
      if (produced) response.produced = produced;
      return response;
    });
  }
}

export type Tx = Prisma.TransactionClient;
