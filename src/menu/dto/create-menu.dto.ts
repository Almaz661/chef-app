import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMenuDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
