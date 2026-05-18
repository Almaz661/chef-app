import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ExpiringQueryDto {
  /**
   * Look-ahead window in days. `expiresAt <= now + days` is "soon";
   * `expiresAt < now` is always considered expired regardless of `days`.
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  days?: number;
}
