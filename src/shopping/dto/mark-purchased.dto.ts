import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

import { InventoryLocationDto } from '../../inventory/dto/list-inventory.dto';

export class MarkPurchasedDto {
  /**
   * Quantity actually purchased, in the SAME unit as the shopping list item.
   * If omitted, the remaining quantity is used (`quantity - purchasedQuantity`).
   */
  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @IsEnum(InventoryLocationDto)
  @IsOptional()
  location?: InventoryLocationDto;

  @IsString()
  @IsOptional()
  note?: string;

  /**
   * Optional ISO date — when this batch goes off (`expiresAt`).
   * If omitted, the resulting inventory batch has no expiry.
   */
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
