import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { ListInventoryDto } from './dto/list-inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(@Query() filter: ListInventoryDto) {
    return this.inventory.list(filter);
  }

  @Post('adjust')
  adjust(@Body() dto: AdjustInventoryDto) {
    return this.inventory.adjust(dto);
  }
}
