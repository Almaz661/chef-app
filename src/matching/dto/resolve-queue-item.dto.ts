import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ResolveQueueItemDto {
  @IsString()
  productId!: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  /** If true, persists the queue item's parsedName as a new ProductAlias. */
  @IsBoolean()
  @IsOptional()
  createAlias?: boolean;
}
