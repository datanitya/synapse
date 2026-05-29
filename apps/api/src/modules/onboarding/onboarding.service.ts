import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingComplete: true },
    });
    return { complete: user?.onboardingComplete ?? false };
  }

  async complete(userId: string, dto: CompleteOnboardingDto) {
    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        niche: dto.niche,
        niches: dto.niches,
        goals: dto.goals,
        targetAudience: dto.targetAudience,
        toneStyle: dto.toneStyle,
        writingExamples: dto.writingExamples ?? [],
        avoidTopics: dto.avoidTopics ?? [],
        postingFrequency: dto.postingFrequency,
        preferredDays: dto.preferredDays,
        timezone: dto.timezone,
        emailNotifications: dto.emailNotifications ?? true,
        reminderEnabled: dto.reminderEnabled ?? true,
        reminderLeadHours: dto.reminderLeadHours ?? 1,
      },
      update: {
        niche: dto.niche,
        niches: dto.niches,
        goals: dto.goals,
        targetAudience: dto.targetAudience,
        toneStyle: dto.toneStyle,
        writingExamples: dto.writingExamples ?? [],
        avoidTopics: dto.avoidTopics ?? [],
        postingFrequency: dto.postingFrequency,
        preferredDays: dto.preferredDays,
        timezone: dto.timezone,
        emailNotifications: dto.emailNotifications ?? true,
        reminderEnabled: dto.reminderEnabled ?? true,
        reminderLeadHours: dto.reminderLeadHours ?? 1,
      },
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: { onboardingComplete: true },
      include: { preferences: true },
    });
  }
}
