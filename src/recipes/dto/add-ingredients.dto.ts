import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * One ingredient line — either a free-form `raw` string (which goes through
 * the parser and matcher) or a fully `structured` payload.
 *
 * If both are provided, `structured` wins.
 */
export class AddIngredientItemDto {
  @IsString()
  @MaxLength(500)
  @IsOptional()
  raw?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class AddIngredientsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AddIngredientItemDto)
  items!: AddIngredientItemDto[];
}
