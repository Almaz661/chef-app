import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { ResolveQueueItemDto } from './dto/resolve-queue-item.dto';
import { ParsedIngredient, parseIngredient } from './ingredient-parser';
import type { MatchCandidate, MatchResult } from './matching.types';
import { normalizeText } from './text-normalize';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly strongThreshold: number;
  private readonly weakThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.strongThreshold = Number(config.get('MATCH_STRONG', 0.65));
    this.weakThreshold = Number(config.get('MATCH_WEAK', 0.45));
  }

  parse(raw: string): ParsedIngredient {
    return parseIngredient(raw);
  }

  /**
   * Resolve a parsed ingredient name to a Product, in 3 stages:
   *   1. exact match on `ProductAlias.normalizedText`
   *   2. trigram similarity (pg_trgm) — top candidate above STRONG threshold
   *   3. otherwise, return ambiguous candidates (above WEAK) or none
   */
  async resolve(parsed: ParsedIngredient, locale = 'ru'): Promise<MatchResult> {
    if (!parsed.name) {
      return { kind: 'none', candidates: [] };
    }

    const normalized = normalizeText(parsed.name);

    // 1) exact alias match
    const exact = await this.prisma.productAlias.findUnique({
      where: { normalizedText_locale: { normalizedText: normalized, locale } },
      include: { product: true },
    });
    if (exact) {
      return { kind: 'exact', productId: exact.productId, productName: exact.product.name };
    }

    // 2) fuzzy via trigram similarity. Top 3 candidates only.
    const candidates = await this.prisma.$queryRaw<
      Array<{ product_id: string; product_name: string; score: number }>
    >(Prisma.sql`
      SELECT pa."productId" AS product_id,
             p.name          AS product_name,
             similarity(pa."normalizedText", ${normalized})::float AS score
        FROM product_aliases pa
        JOIN products p ON p.id = pa."productId"
       WHERE pa.locale = ${locale}
       ORDER BY score DESC
       LIMIT 3
    `);

    const ranked: MatchCandidate[] = candidates.map((c) => ({
      productId: c.product_id,
      productName: c.product_name,
      score: c.score,
    }));

    const best = ranked[0];
    if (best && best.score >= this.strongThreshold) {
      return {
        kind: 'fuzzy',
        productId: best.productId,
        productName: best.productName,
        score: best.score,
      };
    }
    if (best && best.score >= this.weakThreshold) {
      return { kind: 'ambiguous', candidates: ranked };
    }
    return { kind: 'none', candidates: ranked };
  }

  // ---------- Queue ----------

  listQueue() {
    return this.prisma.ingredientMatchQueue.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async enqueue(args: {
    recipeId?: string;
    parsed: ParsedIngredient;
    reason: 'no_match' | 'ambiguous';
    candidates: MatchCandidate[];
  }) {
    return this.prisma.ingredientMatchQueue.create({
      data: {
        recipeId: args.recipeId,
        rawText: args.parsed.raw,
        parsedName: args.parsed.name,
        quantity: args.parsed.quantity ?? undefined,
        unitId: args.parsed.unitId ?? undefined,
        reason: args.reason,
        candidates: args.candidates as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Operator decision: tie a queued raw line to a specific product.
   * If `createAlias` is set, the queue item's parsedName is recorded as a new
   * ProductAlias so future identical lines auto-match.
   * If the queue item has a recipeId, a RecipeIngredient row is created.
   */
  async resolveQueueItem(id: string, dto: ResolveQueueItemDto) {
    const item = await this.prisma.ingredientMatchQueue.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`queue item ${id} not found`);

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`product ${dto.productId} not found`);

    const unitId = dto.unitId ?? item.unitId ?? product.baseUnitId;
    const quantity = dto.quantity ?? Number(item.quantity ?? 0);

    if (!unitId) throw new ConflictException('cannot resolve: no unit available');
    if (!quantity || quantity <= 0) {
      throw new ConflictException('cannot resolve: quantity must be > 0');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.createAlias && item.parsedName) {
        const normalized = normalizeText(item.parsedName);
        await tx.productAlias.upsert({
          where: { normalizedText_locale: { normalizedText: normalized, locale: 'ru' } },
          update: { productId: product.id, text: item.parsedName },
          create: {
            productId: product.id,
            text: item.parsedName,
            normalizedText: normalized,
            locale: 'ru',
          },
        });
      }

      let ingredient = null;
      if (item.recipeId) {
        ingredient = await tx.recipeIngredient.create({
          data: {
            recipeId: item.recipeId,
            productId: product.id,
            quantity,
            unitId,
            rawText: item.rawText,
          },
        });
      }

      await tx.ingredientMatchQueue.delete({ where: { id } });

      return { resolved: true, ingredient };
    });
  }
}
