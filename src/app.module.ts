import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MatchingModule } from './matching/matching.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { RecipesModule } from './recipes/recipes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ProductsModule,
    MatchingModule,
    RecipesModule,
  ],
})
export class AppModule {}
