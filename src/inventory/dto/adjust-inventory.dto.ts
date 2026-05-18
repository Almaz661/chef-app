import { IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

import { InventoryLocationDto } from './list-inventory.dto';

export class AdjustInventoryDto {
  @IsString()
  productId!: string;

  /** Signed quantity in the product's base unit (+ to add, - to remove). */
  @IsNumber()
  quantity!: number;

  @IsEnum(InventoryLocationDto)
  @IsOptional()
  location?: InventoryLocationDto;

  @IsString()
  @MinLength(1)
  note!: string;
}
