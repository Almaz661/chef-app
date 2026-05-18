import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum InventoryLocationDto {
  PANTRY = 'PANTRY',
  FRIDGE = 'FRIDGE',
  FREEZER = 'FREEZER',
}

export class ListInventoryDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsEnum(InventoryLocationDto)
  @IsOptional()
  location?: InventoryLocationDto;
}
