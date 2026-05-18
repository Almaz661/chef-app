import {
  ArrayUnique,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: 'slug must be lowercase alphanumeric with optional dashes',
  })
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  baseUnitId!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  kcalPer100?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  proteinPer100?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  fatPer100?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  carbsPer100?: number;

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  tags?: string[];
}
