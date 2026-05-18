import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

  /**
   * Optional ISO date for the new batch when `quantity > 0`.
   * Ignored for negative adjustments (consumption picks batches by FEFO).
   */
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
