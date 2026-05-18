import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { findIncompatibleIngredients, tagsAreCompatible } from './diet-tags';
import { CreateSubstitutionDto } from './dto/create-substitution.dto';

interface SubstitutionRow {
  productId: string;
  slug: string;
  name: string;
  tags: string[];
  matches: boolean;
  conversionRatio: number;
  bidirectional: boolean;
  note: string | null;
}

@Injectable()
export class DietService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CRUD on substitutions ----------

  async createSubstitution(productId: string, dto: CreateSubstitutionDto) {
    if (productId === dto.substituteId) {
      throw new BadRequestException('a product cannot substitute itself');
    }
    const [a, b] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } }),
      this.prisma.product.findUnique({
        where: { id: dto.substituteId },
        select: { id: true },
      }),
    ]);
    if (!a) throw new NotFoundException(`product ${productId} not found`);
    if (!b) throw new NotFoundException(`substitute ${dto.substituteId} not found`);

    try {
      return await this.prisma.productSubstitution.create({
        data: {
          productId,
          substituteId: dto.substituteId,
          conversionRatio: dto.conversionRatio ?? 1,
          bidirectional: dto.bidirectional ?? true,
          note: dto.note,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          `substitution ${productId} -> ${dto.substituteId} already exists`,
        );
      }
      throw err;
    }
  }

  async deleteSubstitution(productId: string, substituteId: string) {
    const row = await this.prisma.productSubstitution.findUnique({
      where: { productId_substituteId: { productId, substituteId } },
    });
    if (!row) {
      throw new NotFoundException(
        `substitution ${productId} -> ${substituteId} not found`,
      );
    }
    await this.prisma.productSubstitution.delete({ where: { id: row.id } });
  }

  // ---------- Read sides ----------

  async listSubstitutes(
    productId: string,
    requiredTags: readonly string[],
  ): Promise<{
    product: { id: string; slug: string; name: string; tags: string[] };
    required: string[];
    substitutes: SubstitutionRow[];
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true, name: true, tags: true },
    });
    if (!product) throw new NotFoundException(`product ${productId} not found`);

    // Direct: this product → others.
    const direct = await this.prisma.productSubstitution.findMany({
      where: { productId },
      include: {
        substitute: { select: { id: true, slug: true, name: true, tags: true } },
      },
    });

    // Reverse: others → this product, but only when bidirectional.
    const reverse = await this.prisma.productSubstitution.findMany({
      where: { substituteId: productId, bidirectional: true },
      include: {
        product: { select: { id: true, slug: true, name: true, tags: true } },
      },
    });

    const seen = new Set<string>();
    const substitutes: SubstitutionRow[] = [];

    for (const row of direct) {
      const p = row.substitute;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      substitutes.push({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        tags: p.tags,
        matches: tagsAreCompatible(p.tags, requiredTags),
        conversionRatio: Number(row.conversionRatio),
        bidirectional: row.bidirectional,
        note: row.note,
      });
    }

    for (const row of reverse) {
      const p = row.product;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const ratio = Number(row.conversionRatio);
      substitutes.push({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        tags: p.tags,
        matches: tagsAreCompatible(p.tags, requiredTags),
        // Reverse direction inverts the ratio (1 unit B ≈ 1/ratio units A).
        // Guard against zero/missing.
        conversionRatio: ratio > 0 ? 1 / ratio : 1,
        bidirectional: row.bidirectional,
        note: row.note,
      });
    }

    // Stable order: matching first, then by name.
    substitutes.sort((a, b) => {
      if (a.matches !== b.matches) return a.matches ? -1 : 1;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });

    return {
      product,
      required: [...requiredTags],
      substitutes,
    };
  }

  async analyzeRecipe(recipeId: string, requiredTags: readonly string[]) {
    if (requiredTags.length === 0) {
      throw new BadRequestException('diet-check requires at least one tag');
    }

    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        id: true,
        title: true,
        ingredients: {
          orderBy: { position: 'asc' },
          select: {
            productId: true,
            product: { select: { id: true, name: true, tags: true } },
          },
        },
      },
    });
    if (!recipe) throw new NotFoundException(`recipe ${recipeId} not found`);

    const flat = recipe.ingredients.map((i) => ({
      productId: i.product.id,
      productName: i.product.name,
      tags: i.product.tags,
    }));

    const incompatibleRefs = findIncompatibleIngredients(flat, requiredTags);

    const incompatible = await Promise.all(
      incompatibleRefs.map(async (ref) => {
        const subs = await this.listSubstitutes(ref.productId, requiredTags);
        return {
          productId: ref.productId,
          productName: ref.productName,
          productTags: ref.tags,
          suggestions: subs.substitutes
            .filter((s) => s.matches)
            .map((s) => ({
              productId: s.productId,
              name: s.name,
              tags: s.tags,
              conversionRatio: s.conversionRatio,
            })),
        };
      }),
    );

    return {
      recipe: { id: recipe.id, title: recipe.title },
      required: [...requiredTags],
      ok: incompatible.length === 0,
      incompatible,
    };
  }
}
