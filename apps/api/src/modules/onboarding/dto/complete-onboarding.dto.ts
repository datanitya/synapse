import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ArrayNotEmpty,
} from 'class-validator';
import {
  ToneStyle,
  PostingGoal,
  PostingFrequency,
  DayOfWeek,
} from '@prisma/client';

export class CompleteOnboardingDto {
  @IsString()
  niche: string;

  @IsArray()
  @ArrayNotEmpty()
  niches: string[];

  @IsArray()
  @IsEnum(PostingGoal, { each: true })
  goals: PostingGoal[];

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsEnum(ToneStyle)
  toneStyle: ToneStyle;

  @IsOptional()
  @IsArray()
  writingExamples?: string[];

  @IsOptional()
  @IsArray()
  avoidTopics?: string[];

  @IsEnum(PostingFrequency)
  postingFrequency: PostingFrequency;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  preferredDays: DayOfWeek[];

  @IsString()
  timezone: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24)
  reminderLeadHours?: number;
}
