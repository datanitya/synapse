import { IsEnum, IsOptional, IsString, IsUrl, IsDateString } from 'class-validator';
import { ContentType } from '@prisma/client';

export class CreateContentBankItemDto {
  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsDateString()
  suggestedPostAt?: string;
}
