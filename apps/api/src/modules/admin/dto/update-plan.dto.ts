import {
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  monthlyTokenLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000)
  priceInr?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  razorpayPlanId?: string;
}
