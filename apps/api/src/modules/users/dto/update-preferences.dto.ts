import {
  IsString, IsArray, IsEnum, IsOptional,
  IsBoolean, IsInt, Min, Max,
} from 'class-validator';
import { ToneStyle, PostingGoal, PostingFrequency, DayOfWeek } from '@prisma/client';

export class UpdatePreferencesDto {
  @IsOptional() @IsString()
  niche?: string;

  @IsOptional() @IsArray()
  niches?: string[];

  @IsOptional() @IsArray() @IsEnum(PostingGoal, { each: true })
  goals?: PostingGoal[];

  @IsOptional() @IsString()
  targetAudience?: string;

  @IsOptional() @IsEnum(ToneStyle)
  toneStyle?: ToneStyle;

  @IsOptional() @IsArray()
  writingExamples?: string[];

  @IsOptional() @IsArray()
  avoidTopics?: string[];

  @IsOptional() @IsEnum(PostingFrequency)
  postingFrequency?: PostingFrequency;

  @IsOptional() @IsArray() @IsEnum(DayOfWeek, { each: true })
  preferredDays?: DayOfWeek[];

  @IsOptional() @IsString()
  timezone?: string;

  @IsOptional() @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional() @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(24)
  reminderLeadHours?: number;

  @IsOptional() @IsString()
  hookStyle?: string;

  @IsOptional() @IsString()
  writingStyle?: string;

  @IsOptional() @IsString()
  sentenceLength?: string;

  @IsOptional() @IsString()
  ctaStyle?: string;

  @IsOptional() @IsString()
  valueProposition?: string;
}
