import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum RecipeGroupDto {
  BREAKFAST = 'BREAKFAST',
  SOUP = 'SOUP',
  MAIN = 'MAIN',
  SALAD = 'SALAD',
  BAKING = 'BAKING',
  DESSERT = 'DESSERT',
  DRINK = 'DRINK',
  PREP = 'PREP',
}

/**
 * Phase 6.7. Where a produced PREP batch lands by default. PANTRY
 * intentionally not allowed here — store-temperature semi-finished
 * products are out of scope.
 */
export enum PrepDefaultLocationDto {
  FRIDGE = 'FRIDGE',
  FREEZER = 'FREEZER',
}

export class CreateRecipeDto {
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
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  servings?: number;

  @IsEnum(RecipeGroupDto)
  @IsOptional()
  group?: RecipeGroupDto;

  // ---------- Phase 6.7: prep recipe fields ----------
  // All five must be provided together, or none at all. The all-or-nothing
  // rule is enforced in RecipesService (not via decorators, to keep this
  // file readable).

  @IsString()
  @IsOptional()
  producesProductId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  prepYieldQuantity?: number;

  @IsString()
  @IsOptional()
  prepYieldUnitId?: string;

  @IsEnum(PrepDefaultLocationDto)
  @IsOptional()
  prepDefaultLocation?: PrepDefaultLocationDto;

  @IsInt()
  @Min(1)
  @Max(3650)
  @IsOptional()
  prepShelfLifeDays?: number;
}
