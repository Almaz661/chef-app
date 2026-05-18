import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { RecipeGroupDto } from './create-recipe.dto';

/**
 * Query string filters for `GET /recipes`.
 * Used as a thin parameter object — no Type() conversion needed since
 * everything is a string.
 */
export class ListRecipesDto {
  @IsEnum(RecipeGroupDto)
  @IsOptional()
  group?: RecipeGroupDto;

  /**
   * Substring search over title + description (case-insensitive).
   * Empty/whitespace is ignored.
   */
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}
