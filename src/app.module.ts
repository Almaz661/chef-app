import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { InventoryModule } from './inventory/inventory.module';
import { MatchingModule } from './matching/matching.module';
import { MenuModule } from './menu/menu.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { RecipesModule } from './recipes/recipes.module';
import { ShoppingModule } from './shopping/shopping.module';
import { UnitsModule } from './units/units.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UnitsModule,
    ProductsModule,
    MatchingModule,
    RecipesModule,
    MenuModule,
    InventoryModule,
    ShoppingModule,
  ],
})
export class AppModule {}
