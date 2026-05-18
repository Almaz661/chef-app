import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAliasDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  text!: string;

  @IsString()
  @IsOptional()
  locale?: string;
}
