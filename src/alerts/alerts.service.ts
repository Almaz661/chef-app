import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_DAYS = 3;

export interface ExpiringRow {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  location: string;
  quantity: number;
  baseUnitId: string;
  expiresAt: Date;
  status: 'EXPIRED' | 'SOON';
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async listExpiring(days = DEFAULT_DAYS): Promise<ExpiringRow[]> {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.inventoryItem.findMany({
      where: {
        expiresAt: { not: null, lte: horizon },
      },
      orderBy: [{ expiresAt: 'asc' }],
      include: {
        product: { select: { name: true, slug: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      productSlug: r.product.slug,
      location: r.location,
      quantity: Number(r.quantity),
      baseUnitId: r.unitId,
      expiresAt: r.expiresAt as Date,
      status: (r.expiresAt as Date) < now ? 'EXPIRED' : 'SOON',
    }));
  }

  async countExpiring(days = DEFAULT_DAYS): Promise<{ expired: number; soon: number }> {
    const list = await this.listExpiring(days);
    let expired = 0;
    let soon = 0;
    for (const it of list) {
      if (it.status === 'EXPIRED') expired++;
      else soon++;
    }
    return { expired, soon };
  }
}
