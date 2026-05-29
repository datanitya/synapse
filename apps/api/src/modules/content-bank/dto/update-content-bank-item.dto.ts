import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { DraftStatus } from '@prisma/client';

export class UpdateContentBankItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsEnum(DraftStatus)
  status?: DraftStatus;

  @IsOptional()
  @IsDateString()
  suggestedPostAt?: string | null;

  @IsOptional()
  @IsDateString()
  postedAt?: string | null;
}
