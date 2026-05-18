import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { AddMenuRecipeDto } from './dto/add-menu-recipe.dto';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuService } from './menu.service';

@Controller('menus')
export class MenuController {
  constructor(private readonly menus: MenuService) {}

  @Get()
  list() {
    return this.menus.list();
  }

  @Post()
  create(@Body() dto: CreateMenuDto) {
    return this.menus.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.menus.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.menus.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.menus.remove(id);
  }

  @Post(':id/recipes')
  addRecipe(@Param('id') id: string, @Body() dto: AddMenuRecipeDto) {
    return this.menus.addRecipe(id, dto);
  }

  @Delete(':id/recipes/:menuRecipeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRecipe(@Param('id') id: string, @Param('menuRecipeId') mrId: string) {
    return this.menus.removeRecipe(id, mrId);
  }
}
