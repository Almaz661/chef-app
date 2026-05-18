import { IsEnum, IsOptional } from 'class-validator';

import { InventoryLocationDto } from '../../inventory/dto/list-inventory.dto';

export class CookDto {
  @IsEnum(InventoryLocationDto)
  @IsOptional()
  preferLocation?: InventoryLocationDto;
}
