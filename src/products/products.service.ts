import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { normalizeText } from '../matching/text-normalize';
import { PrismaService } from '../prisma/prisma.service';

import { CreateAliasDto } from './dto/create-alias.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { aliases: true, baseUnit: true },
    });
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { aliases: true, baseUnit: true, conversions: true },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto) {
    try {
      // Create the product and a self-alias from its name in one transaction
      // so we never end up with an unmatchable product.
      const normalized = normalizeText(dto.name);
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            slug: dto.slug,
            name: dto.name,
            category: dto.category,
            baseUnitId: dto.baseUnitId,
            kcalPer100: dto.kcalPer100,
            proteinPer100: dto.proteinPer100,
            fatPer100: dto.fatPer100,
            carbsPer100: dto.carbsPer100,
            tags: dto.tags ?? [],
          },
        });

        await tx.productAlias.create({
          data: {
            productId: product.id,
            text: dto.name,
            normalizedText: normalized,
            locale: 'ru',
          },
        });

        return tx.product.findUniqueOrThrow({
          where: { id: product.id },
          include: { aliases: true, baseUnit: true },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('product slug or alias already exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: dto,
        include: { aliases: true, baseUnit: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('product slug already exists');
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.product.delete({ where: { id } });
  }

  async addAlias(productId: string, dto: CreateAliasDto) {
    await this.findById(productId);
    const locale = dto.locale ?? 'ru';
    const normalized = normalizeText(dto.text);
    try {
      return await this.prisma.productAlias.create({
        data: {
          productId,
          text: dto.text,
          normalizedText: normalized,
          locale,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`alias "${dto.text}" already exists for locale ${locale}`);
      }
      throw err;
    }
  }

  async removeAlias(productId: string, aliasId: string) {
    const alias = await this.prisma.productAlias.findUnique({ where: { id: aliasId } });
    if (!alias || alias.productId !== productId) {
      throw new NotFoundException(`alias ${aliasId} not found on product ${productId}`);
    }
    await this.prisma.productAlias.delete({ where: { id: aliasId } });
  }
}
