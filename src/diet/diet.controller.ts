import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { parseTagsQuery } from './diet-tags';
import { DietService } from './diet.service';
import { CreateSubstitutionDto } from './dto/create-substitution.dto';

@Controller()
export class DietController {
  constructor(private readonly diet: DietService) {}

  @Get('products/:id/substitutes')
  list(@Param('id') id: string, @Query('tags') tags?: string) {
    return this.diet.listSubstitutes(id, parseTagsQuery(tags));
  }

  @Post('products/:id/substitutes')
  create(@Param('id') id: string, @Body() dto: CreateSubstitutionDto) {
    return this.diet.createSubstitution(id, dto);
  }

  @Delete('products/:id/substitutes/:substituteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Param('substituteId') substituteId: string) {
    return this.diet.deleteSubstitution(id, substituteId);
  }

  @Get('recipes/:id/diet-check')
  check(@Param('id') id: string, @Query('tags') tags?: string) {
    return this.diet.analyzeRecipe(id, parseTagsQuery(tags));
  }
}
