import { Controller, Get, Param } from '@nestjs/common';

import { NutritionService } from './nutrition.service';

@Controller()
export class NutritionController {
  constructor(private readonly nutrition: NutritionService) {}

  @Get('recipes/:id/nutrition')
  forRecipe(@Param('id') id: string) {
    return this.nutrition.forRecipe(id);
  }

  @Get('menus/:id/nutrition')
  forMenu(@Param('id') id: string) {
    return this.nutrition.forMenu(id);
  }
}
