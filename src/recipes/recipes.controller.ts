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

import { AddIngredientsDto } from './dto/add-ingredients.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @Get()
  list() {
    return this.recipes.list();
  }

  @Post()
  create(@Body() dto: CreateRecipeDto) {
    return this.recipes.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.recipes.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipes.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.recipes.remove(id);
  }

  @Post(':id/ingredients')
  addIngredients(@Param('id') id: string, @Body() dto: AddIngredientsDto) {
    return this.recipes.addIngredients(id, dto);
  }
}
