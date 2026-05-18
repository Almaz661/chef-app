import { Body, Controller, Param, Post } from '@nestjs/common';

import { CookingService } from './cooking.service';
import { CookDto } from './dto/cook.dto';

@Controller('menu-recipes')
export class CookingController {
  constructor(private readonly cooking: CookingService) {}

  @Post(':id/cook')
  cook(@Param('id') id: string, @Body() dto: CookDto) {
    return this.cooking.cook(id, dto);
  }
}
