import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryLocation,
  InventoryTxnSource,
  Prisma,
} from '@prisma/client';

import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnitConverterService } from '../units/unit-converter.service';
import { convertQuantity } from '../units/unit-conversions';

import {
  aggregate,
  AggregateInputRecipe,
  subtractStock,
} from './aggregator';
import { GenerateListDto } from './dto/generate-list.dto';
import { MarkPurchasedDto } from './dto/mark-purchased.dto';

const EPS = 1e-9;
const DEFAULT_LOCATION: InventoryLocation = InventoryLocation.PANTRY;

@Injectable()
export class ShoppingService {
  private readonly logger = new Logger(ShoppingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly converter: UnitConverterService,
    private readonly inventory: InventoryService,
  ) {}

  async findById(id: string) {
    const list = await this.prisma.shoppingList.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            product: { select: { id: true, slug: true, name: true, baseUnitId: true } },
            unit: true,
          },
        },
      },
    });
    if (!list) throw new NotFoundException(`shopping list ${id} not found`);
    return list;
  }

  async generateFromMenu(menuId: string, dto: GenerateListDto) {
    const menu = await this.prisma.menu.findUnique({
      where: { id: menuId },
      include: {
        recipes: {
          include: {
            recipe: {
              select: {
                id: true,
                servings: true,
                ingredients: {
                  select: {
                    productId: true,
                    quantity: true,
                    unitId: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!menu) throw new NotFoundException(`menu ${menuId} not found`);
    if (menu.recipes.length === 0) {
      throw new BadRequestException('menu has no recipes; nothing to buy');
    }

    // Collect productIds and load conversion + product base units in one go.
    const productIds = new Set<string>();
    const recipes: AggregateInputRecipe[] = menu.recipes.map((mr) => {
      mr.recipe.ingredients.forEach((i) => productIds.add(i.productId));
      const recipeServings = mr.recipe.servings || 1;
      const scale = (mr.servings || recipeServings) / recipeServings;
      return {
        servingsScale: scale,
        ingredients: mr.recipe.ingredients.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitId: i.unitId,
        })),
      };
    });

    const productIdList = [...productIds];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIdList } },
      select: { id: true, baseUnitId: true },
    });
    const baseUnit = new Map(products.map((p) => [p.id, p.baseUnitId]));

    const dict = await this.converter.loadDictionary(productIdList);
    const convert = (qty: number, from: string, to: string, productId: string): number | null =>
      convertQuantity(dict, qty, from, to, productId);

    const { items, errors } = aggregate(recipes, baseUnit, convert);

    if (errors.length > 0) {
      // Fail the whole generation rather than producing a partial list — the
      // user must add UnitConversion rows or fix recipe units first.
      throw new BadRequestException({
        message: 'unit conversion failed for some ingredients',
        errors,
      });
    }

    let toBuy = items;
    if (dto.subtractInventory ?? true) {
      const stock = await this.inventory.stockByProduct(productIdList);
      toBuy = subtractStock(items, stock);
    }

    if (toBuy.length === 0) {
      // Edge case: pantry already has everything. Still create an empty list
      // so the caller gets a stable id; alternatively could 204 — this is a
      // deliberate API choice.
    }

    return this.prisma.$transaction(async (tx) => {
      const list = await tx.shoppingList.create({
        data: { menuId },
      });

      if (toBuy.length > 0) {
        await tx.shoppingListItem.createMany({
          data: toBuy.map((it, idx) => ({
            shoppingListId: list.id,
            productId: it.productId,
            quantity: it.quantity,
            unitId: it.unitId,
            position: idx,
          })),
        });
      }

      return tx.shoppingList.findUniqueOrThrow({
        where: { id: list.id },
        include: {
          items: {
            orderBy: { position: 'asc' },
            include: { product: { select: { id: true, slug: true, name: true } }, unit: true },
          },
        },
      });
    });
  }

  /**
   * THE FIX for "marked purchased but inventory stays empty".
   *
   * All side-effects (item update + inventory upsert + audit row) execute
   * inside one prisma.$transaction. If any step fails, the entire purchase
   * is rolled back — there is no "purchased but not in inventory" state.
   */
  async markPurchased(listId: string, itemId: string, dto: MarkPurchasedDto) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.shoppingListItem.findUnique({
        where: { id: itemId },
        include: {
          shoppingList: { select: { id: true, status: true } },
          product: { select: { id: true, baseUnitId: true } },
        },
      });
      if (!item) throw new NotFoundException(`shopping_list_item ${itemId} not found`);
      if (item.shoppingListId !== listId) {
        throw new NotFoundException(`item ${itemId} does not belong to list ${listId}`);
      }
      if (item.shoppingList.status === 'CLOSED') {
        throw new BadRequestException('shopping list is closed');
      }

      const need = Number(item.quantity);
      const already = Number(item.purchasedQuantity);
      const remaining = need - already;
      if (remaining <= EPS) {
        throw new BadRequestException('this item is already fully purchased');
      }

      const purchaseQty = dto.quantity ?? remaining;
      if (purchaseQty <= 0) {
        throw new BadRequestException('quantity must be > 0');
      }
      if (purchaseQty > remaining + EPS) {
        throw new BadRequestException(
          `cannot purchase more than remaining (${remaining} ${item.unitId})`,
        );
      }

      const newPurchased = already + purchaseQty;
      const fullyDone = newPurchased >= need - EPS;

      // Convert purchased qty to base unit BEFORE writing inventory.
      // If conversion is missing, abort the entire transaction.
      const baseUnitId = item.product.baseUnitId;
      let baseQty: number | null;
      if (item.unitId === baseUnitId) {
        baseQty = purchaseQty;
      } else {
        baseQty = await this.converter.convert(
          purchaseQty,
          item.unitId,
          baseUnitId,
          item.product.id,
          tx,
        );
      }
      if (baseQty === null || baseQty <= 0) {
        throw new BadRequestException(
          `cannot convert ${purchaseQty} ${item.unitId} to base unit ${baseUnitId} for product ${item.product.id}`,
        );
      }

      // 1) update the shopping list item
      await tx.shoppingListItem.update({
        where: { id: itemId },
        data: {
          purchasedQuantity: newPurchased,
          purchasedAt: fullyDone ? new Date() : null,
        },
      });

      // 2) upsert inventory + 3) write audit, both inside this same tx
      const location = (dto.location as InventoryLocation | undefined) ?? DEFAULT_LOCATION;
      const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
      await this.inventory.addStockTx(tx as Prisma.TransactionClient, {
        productId: item.product.id,
        baseUnitId,
        quantity: baseQty,
        location,
        source: InventoryTxnSource.PURCHASE,
        refType: 'ShoppingListItem',
        refId: itemId,
        note: dto.note,
        expiresAt,
      });

      return {
        itemId,
        purchasedQuantity: newPurchased,
        fullyDone,
        inventory: {
          productId: item.product.id,
          location,
          addedQuantity: baseQty,
          baseUnitId,
          expiresAt,
        },
      };
    });
  }
}
