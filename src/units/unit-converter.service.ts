import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import {
  ConversionDictionary,
  ConversionRule,
  convertQuantity,
  findFactor,
} from './unit-conversions';

type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class UnitConverterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads conversion rules relevant to `productIds` plus all global rules.
   * Pass a transaction client when called from within `prisma.$transaction`.
   */
  async loadDictionary(productIds: string[], tx: Tx = this.prisma): Promise<ConversionDictionary> {
    const rows = await tx.unitConversion.findMany({
      where: {
        OR: [{ productId: null }, ...(productIds.length ? [{ productId: { in: productIds } }] : [])],
      },
      select: { productId: true, fromUnitId: true, toUnitId: true, factor: true },
    });

    return rows.map(
      (r): ConversionRule => ({
        productId: r.productId,
        fromUnitId: r.fromUnitId,
        toUnitId: r.toUnitId,
        factor: Number(r.factor),
      }),
    );
  }

  /**
   * Convenience for single-shot conversion (loads only what is needed).
   * Returns null if conversion isn't possible.
   */
  async convert(
    qty: number,
    fromUnitId: string,
    toUnitId: string,
    productId: string,
    tx: Tx = this.prisma,
  ): Promise<number | null> {
    if (fromUnitId === toUnitId) return qty;
    const dict = await this.loadDictionary([productId], tx);
    return convertQuantity(dict, qty, fromUnitId, toUnitId, productId);
  }

  /** Pure function re-export for services that already loaded the dictionary. */
  static convertWith = convertQuantity;
  static factorWith = findFactor;
}
