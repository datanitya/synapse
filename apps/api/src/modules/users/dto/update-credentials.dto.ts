import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiProvider } from '@prisma/client';

export class UpdateCredentialsDto {
  @IsOptional()
  @IsEnum(AiProvider)
  aiProvider?: AiProvider;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  aiModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  openaiApiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  geminiApiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  anthropicApiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  linkedinClientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedinClientSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  linkedinCompanyId?: string;
}
