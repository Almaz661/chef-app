import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
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
}
