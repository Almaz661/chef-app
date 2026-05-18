import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { GenerateListDto } from './dto/generate-list.dto';
import { MarkPurchasedDto } from './dto/mark-purchased.dto';
import { ShoppingService } from './shopping.service';

@Controller()
export class ShoppingController {
  constructor(private readonly shopping: ShoppingService) {}

  @Post('menus/:id/shopping-list')
  generate(@Param('id') menuId: string, @Body() dto: GenerateListDto) {
    return this.shopping.generateFromMenu(menuId, dto);
  }

  @Get('shopping-lists/:id')
  get(@Param('id') id: string) {
    return this.shopping.findById(id);
  }

  @Patch('shopping-lists/:listId/items/:itemId/purchase')
  markPurchased(
    @Param('listId') listId: string,
    @Param('itemId') itemId: string,
    @Body() dto: MarkPurchasedDto,
  ) {
    return this.shopping.markPurchased(listId, itemId, dto);
  }
}
