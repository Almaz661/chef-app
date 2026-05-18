import { Module } from '@nestjs/common';

import { InventoryModule } from '../inventory/inventory.module';
import { MenuModule } from '../menu/menu.module';

import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';

@Module({
  imports: [InventoryModule, MenuModule],
  controllers: [ShoppingController],
  providers: [ShoppingService],
  exports: [ShoppingService],
})
export class ShoppingModule {}
