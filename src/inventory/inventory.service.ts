import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryLocation,
  InventoryTxnSource,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryLocationDto, ListInventoryDto } from './dto/list-inventory.dto';

type Tx = Prisma.TransactionClient;

const DEFAULT_LOCATION: InventoryLocation = InventoryLocation.PANTRY;

export interface AddStockArgs {
  productId: string;
  baseUnitId: string;
  /** Quantity in `baseUnitId`. Must be > 0. */
  quantity: number;
  location?: InventoryLocation;
  source: InventoryTxnSource;
  refType?: string;
  refId?: string;
  note?: string;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  list(filter: ListInventoryDto = {}) {
    return this.prisma.inventoryItem.findMany({
      where: {
        productId: filter.productId,
        location: filter.location as InventoryLocation | undefined,
      },
      orderBy: [{ productId: 'asc' }, { location: 'asc' }],
      include: { product: { select: { id: true, slug: true, name: true } }, unit: true },
    });
  }

  /**
   * Add stock to inventory inside an existing transaction. Used by
   * ShoppingService.markPurchased to keep purchase + inventory atomic.
   */
  async addStockTx(tx: Tx, args: AddStockArgs): Promise<void> {
    if (args.quantity <= 0) {
      throw new BadRequestException('addStock: quantity must be > 0');
    }
    const location = args.location ?? DEFAULT_LOCATION;

    await tx.inventoryItem.upsert({
      where: { productId_location: { productId: args.productId, location } },
      create: {
        productId: args.productId,
        quantity: args.quantity,
        unitId: args.baseUnitId,
        location,
      },
      update: {
        quantity: { increment: args.quantity },
        unitId: args.baseUnitId,
      },
    });

    await tx.inventoryTxn.create({
      data: {
        productId: args.productId,
        quantity: args.quantity,
        unitId: args.baseUnitId,
        source: args.source,
        refType: args.refType,
        refId: args.refId,
        note: args.note,
      },
    });
  }

  async adjust(dto: AdjustInventoryDto) {
    if (dto.quantity === 0) {
      throw new BadRequestException('adjust: quantity must be non-zero');
    }
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, baseUnitId: true },
    });
    if (!product) throw new NotFoundException(`product ${dto.productId} not found`);

    const location = (dto.location as InventoryLocation | undefined) ?? DEFAULT_LOCATION;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({
        where: { productId_location: { productId: product.id, location } },
      });
      const current = existing ? Number(existing.quantity) : 0;
      const next = current + dto.quantity;
      if (next < 0) {
        throw new BadRequestException(
          `adjust: would drop inventory below zero (current=${current}, delta=${dto.quantity})`,
        );
      }

      await tx.inventoryItem.upsert({
        where: { productId_location: { productId: product.id, location } },
        create: {
          productId: product.id,
          quantity: next,
          unitId: product.baseUnitId,
          location,
        },
        update: {
          quantity: next,
          unitId: product.baseUnitId,
        },
      });

      await tx.inventoryTxn.create({
        data: {
          productId: product.id,
          quantity: dto.quantity,
          unitId: product.baseUnitId,
          source: InventoryTxnSource.ADJUSTMENT,
          note: dto.note,
        },
      });

      return { productId: product.id, location, quantity: next };
    });
  }

  /** Sum of inventory across locations per product. Used for shopping subtraction. */
  async stockByProduct(productIds: string[], tx: Tx | PrismaService = this.prisma) {
    if (productIds.length === 0) return new Map<string, number>();
    const rows = await tx.inventoryItem.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, quantity: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.productId, (map.get(r.productId) ?? 0) + Number(r.quantity));
    }
    return map;
  }
}

export { InventoryLocationDto };
