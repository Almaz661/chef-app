import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AlertsModule } from './alerts/alerts.module';
import { CookingModule } from './cooking/cooking.module';
import { InventoryModule } from './inventory/inventory.module';
import { MatchingModule } from './matching/matching.module';
import { MenuModule } from './menu/menu.module';
import { NutritionModule } from './nutrition/nutrition.module';
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
    CookingModule,
    NutritionModule,
    AlertsModule,
  ],
})
export class AppModule {}
