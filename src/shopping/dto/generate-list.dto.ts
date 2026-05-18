import { IsBoolean, IsOptional } from 'class-validator';

export class GenerateListDto {
  /** Default true: subtract current inventory from required quantities. */
  @IsBoolean()
  @IsOptional()
  subtractInventory?: boolean;
}
