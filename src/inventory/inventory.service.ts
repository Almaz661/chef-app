import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryLocation,
  InventoryTxnSource,
  Prisma,
} from '@prisma/client';

import {
  Batch,
  Loc,
  Need,
  pickBatches,
} from '../cooking/cooking-planner';
import { PrismaService } from '../prisma/prisma.service';

import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryLocationDto, ListInventoryDto } from './dto/list-inventory.dto';

type Tx = Prisma.TransactionClient;

const DEFAULT_LOCATION: InventoryLocation = InventoryLocation.PANTRY;
const FALLBACK_ORDER: readonly Loc[] = ['PANTRY', 'FRIDGE', 'FREEZER'];

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
  /** Optional batch expiry. */
  expiresAt?: Date | null;
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
      orderBy: [
        { productId: 'asc' },
        { location: 'asc' },
        { expiresAt: 'asc' },
        { acquiredAt: 'asc' },
      ],
      include: { product: { select: { id: true, slug: true, name: true } }, unit: true },
    });
  }

  /**
   * Add stock as a NEW batch inside an existing transaction.
   * Phase 4: each purchase / positive adjustment becomes its own row so
   * batches with different expiry dates do not get merged.
   */
  async addStockTx(tx: Tx, args: AddStockArgs): Promise<void> {
    if (args.quantity <= 0) {
      throw new BadRequestException('addStock: quantity must be > 0');
    }
    const location = args.location ?? DEFAULT_LOCATION;

    await tx.inventoryItem.create({
      data: {
        productId: args.productId,
        quantity: args.quantity,
        unitId: args.baseUnitId,
        location,
        expiresAt: args.expiresAt ?? null,
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
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    return this.prisma.$transaction(async (tx) => {
      if (dto.quantity > 0) {
        // Positive adjustment: create a new batch.
        await tx.inventoryItem.create({
          data: {
            productId: product.id,
            quantity: dto.quantity,
            unitId: product.baseUnitId,
            location,
            expiresAt,
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
        return {
          productId: product.id,
          location,
          delta: dto.quantity,
          createdBatch: true,
        };
      }

      // Negative adjustment: FEFO drain across the chosen location
      // (or all locations if none specified).
      const drainQty = -dto.quantity;
      const items = await tx.inventoryItem.findMany({
        where: {
          productId: product.id,
          ...(dto.location ? { location } : {}),
        },
        select: {
          id: true,
          productId: true,
          location: true,
          quantity: true,
          expiresAt: true,
          acquiredAt: true,
        },
      });

      const grouped = new Map<string, Batch[]>();
      const list = items.map((b) => ({
        id: b.id,
        productId: b.productId,
        location: b.location as Loc,
        quantity: Number(b.quantity),
        expiresAt: b.expiresAt,
        acquiredAt: b.acquiredAt,
      }));
      grouped.set(product.id, list);

      const need: Need = {
        productId: product.id,
        quantity: drainQty,
        baseUnitId: product.baseUnitId,
      };

      const plan = pickBatches({
        needs: [need],
        batches: grouped,
        preferLocation: dto.location ? location : undefined,
        fallbackOrder: dto.location ? [location] : FALLBACK_ORDER,
        now: new Date(),
      });

      if (!plan.ok) {
        throw new BadRequestException({
          message: 'adjust: would drop inventory below zero',
          shortages: plan.shortages,
        });
      }

      for (const line of plan.lines) {
        for (const take of line.takes) {
          const row = await tx.inventoryItem.findUnique({
            where: { id: take.batchId },
            select: { quantity: true },
          });
          if (!row) {
            throw new BadRequestException(`adjust: batch ${take.batchId} disappeared mid-tx`);
          }
          const next = Number(row.quantity) - take.quantity;
          if (next <= 1e-9) {
            await tx.inventoryItem.delete({ where: { id: take.batchId } });
          } else {
            await tx.inventoryItem.update({
              where: { id: take.batchId },
              data: { quantity: next },
            });
          }
        }
      }

      await tx.inventoryTxn.create({
        data: {
          productId: product.id,
          quantity: dto.quantity, // negative
          unitId: product.baseUnitId,
          source: InventoryTxnSource.ADJUSTMENT,
          note: dto.note,
        },
      });

      return { productId: product.id, location, delta: dto.quantity };
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
