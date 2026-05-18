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
  Query,
} from '@nestjs/common';

import { AddIngredientsDto } from './dto/add-ingredients.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { ListRecipesDto } from './dto/list-recipes.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipesService } from './recipes.service';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  /**
   * GET /recipes — supports filters via query string:
   *   ?group=BREAKFAST     pick one of the 7 navigation buttons
   *   ?search=паста        substring over title + description (CI)
   * Both are optional and combine with AND.
   */
  @Get()
  list(@Query() filter: ListRecipesDto) {
    return this.recipes.list(filter);
  }

  /**
   * GET /recipes/groups — counts per group for navigation badges.
   * Always returns all 7 groups + UNGROUPED, with zeros for empty ones.
   */
  @Get('groups')
  groups() {
    return this.recipes.groupCounts();
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
