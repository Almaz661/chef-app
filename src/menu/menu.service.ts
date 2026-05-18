import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { AddMenuRecipeDto } from './dto/add-menu-recipe.dto';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.menu.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { recipes: true } } },
    });
  }

  async findById(id: string) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        recipes: {
          orderBy: { position: 'asc' },
          include: { recipe: { select: { id: true, slug: true, title: true, servings: true } } },
        },
      },
    });
    if (!menu) throw new NotFoundException(`Menu ${id} not found`);
    return menu;
  }

  create(dto: CreateMenuDto) {
    return this.prisma.menu.create({
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async update(id: string, dto: UpdateMenuDto) {
    await this.findById(id);
    return this.prisma.menu.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : undefined,
        endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.menu.delete({ where: { id } });
  }

  async addRecipe(menuId: string, dto: AddMenuRecipeDto) {
    await this.findById(menuId);
    const recipe = await this.prisma.recipe.findUnique({ where: { id: dto.recipeId } });
    if (!recipe) throw new NotFoundException(`recipe ${dto.recipeId} not found`);

    const last = await this.prisma.menuRecipe.findFirst({
      where: { menuId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (last?.position ?? -1) + 1;

    return this.prisma.menuRecipe.create({
      data: {
        menuId,
        recipeId: dto.recipeId,
        servings: dto.servings ?? recipe.servings,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        position,
      },
    });
  }

  async removeRecipe(menuId: string, menuRecipeId: string) {
    const mr = await this.prisma.menuRecipe.findUnique({ where: { id: menuRecipeId } });
    if (!mr || mr.menuId !== menuId) {
      throw new NotFoundException(`menu_recipe ${menuRecipeId} not found in menu ${menuId}`);
    }
    await this.prisma.menuRecipe.delete({ where: { id: menuRecipeId } });
  }
}
