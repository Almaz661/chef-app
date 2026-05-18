import { Module } from '@nestjs/common';

import { CookingController } from './cooking.controller';
import { CookingService } from './cooking.service';

@Module({
  controllers: [CookingController],
  providers: [CookingService],
  exports: [CookingService],
})
export class CookingModule {}
