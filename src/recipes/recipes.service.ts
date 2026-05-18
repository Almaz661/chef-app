import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';

import { AddIngredientItemDto, AddIngredientsDto } from './dto/add-ingredients.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

interface ProcessedItem {
  created?: { id: string; productId: string; quantity: number; unitId: string };
  queued?: { id: string; rawText: string; reason: string };
}

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
  ) {}

  list() {
    return this.prisma.recipe.findMany({ orderBy: { title: 'asc' } });
  }

  async findById(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          orderBy: { position: 'asc' },
          include: { product: true, unit: true },
        },
      },
    });
    if (!recipe) throw new NotFoundException(`Recipe ${id} not found`);
    return recipe;
  }

  async create(dto: CreateRecipeDto) {
    try {
      return await this.prisma.recipe.create({
        data: {
          slug: dto.slug,
          title: dto.title,
          description: dto.description,
          servings: dto.servings ?? 1,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('recipe slug already exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateRecipeDto) {
    await this.findById(id);
    try {
      return await this.prisma.recipe.update({ where: { id }, data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('recipe slug already exists');
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.recipe.delete({ where: { id } });
  }

  /**
   * Add ingredients to a recipe. Each item is either:
   *  - structured (productId + quantity + unitId): inserted directly
   *  - raw string: parsed → matched. On exact/fuzzy hit → inserted.
   *    Otherwise → pushed to IngredientMatchQueue (request still succeeds).
   */
  async addIngredients(recipeId: string, dto: AddIngredientsDto) {
    const recipe = await this.findById(recipeId);
    const startingPosition = recipe.ingredients.length;

    const created: ProcessedItem['created'][] = [];
    const queued: ProcessedItem['queued'][] = [];

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
      const result = await this.processItem(recipeId, item, startingPosition + i);
      if (result.created) created.push(result.created);
      if (result.queued) queued.push(result.queued);
    }

    return { recipeId, created, queued };
  }

  private async processItem(
    recipeId: string,
    item: AddIngredientItemDto,
    position: number,
  ): Promise<ProcessedItem> {
    // 1) Structured — insert directly (after sanity checks).
    if (item.productId) {
      if (!item.quantity || !item.unitId) {
        throw new BadRequestException(
          'structured ingredient requires productId, quantity and unitId',
        );
      }
      const ingredient = await this.prisma.recipeIngredient.create({
        data: {
          recipeId,
          productId: item.productId,
          quantity: item.quantity,
          unitId: item.unitId,
          rawText: item.raw,
          note: item.note,
          position,
        },
      });
      return {
        created: {
          id: ingredient.id,
          productId: ingredient.productId,
          quantity: Number(ingredient.quantity),
          unitId: ingredient.unitId,
        },
      };
    }

    // 2) Raw string — parse + match.
    if (!item.raw || !item.raw.trim()) {
      throw new BadRequestException('ingredient must provide either productId or raw');
    }

    const parsed = this.matching.parse(item.raw);
    const match = await this.matching.resolve(parsed);

    if (match.kind === 'exact' || match.kind === 'fuzzy') {
      const unitId = item.unitId ?? parsed.unitId;
      const quantity = item.quantity ?? parsed.quantity;
      if (!unitId || !quantity || quantity <= 0) {
        // Quantity / unit missing — operator decides.
        const queueItem = await this.matching.enqueue({
          recipeId,
          parsed,
          reason: 'ambiguous',
          candidates: [{ productId: match.productId, productName: match.productName, score: 1 }],
        });
        return {
          queued: { id: queueItem.id, rawText: queueItem.rawText, reason: queueItem.reason },
        };
      }
      const ingredient = await this.prisma.recipeIngredient.create({
        data: {
          recipeId,
          productId: match.productId,
          quantity,
          unitId,
          rawText: parsed.raw,
          note: parsed.note ?? item.note,
          position,
        },
      });
      return {
        created: {
          id: ingredient.id,
          productId: ingredient.productId,
          quantity: Number(ingredient.quantity),
          unitId: ingredient.unitId,
        },
      };
    }

    // 3) ambiguous / none → queue
    const queueItem = await this.matching.enqueue({
      recipeId,
      parsed,
      reason: match.kind === 'ambiguous' ? 'ambiguous' : 'no_match',
      candidates: match.candidates,
    });
    return {
      queued: { id: queueItem.id, rawText: queueItem.rawText, reason: queueItem.reason },
    };
  }
}
