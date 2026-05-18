import { Global, Module } from '@nestjs/common';

import { UnitConverterService } from './unit-converter.service';

@Global()
@Module({
  providers: [UnitConverterService],
  exports: [UnitConverterService],
})
export class UnitsModule {}
