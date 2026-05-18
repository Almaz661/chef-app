import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddMenuRecipeDto {
  @IsString()
  recipeId!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  servings?: number;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;
}
