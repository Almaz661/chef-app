import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSubstitutionDto {
  @IsString()
  substituteId!: string;

  /**
   * 1 unit of `product` ≈ `conversionRatio` units of `substitute`.
   * Stored on the row but not yet applied by the API in Phase 6.
   */
  @IsNumber()
  @IsPositive()
  @IsOptional()
  conversionRatio?: number;

  /** When true, the relation also satisfies the reverse direction. */
  @IsBoolean()
  @IsOptional()
  bidirectional?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}
