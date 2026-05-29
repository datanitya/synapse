import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { preferences: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, data: { name?: string; headline?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const existing = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const niche = dto.niches?.[0] ?? existing?.niche ?? '';

    return this.prisma.userPreferences.upsert({
      where: { userId },
      update: { ...dto, niche },
      create: {
        userId,
        niche,
        niches: dto.niches ?? [],
        goals: dto.goals ?? [],
        toneStyle: dto.toneStyle ?? 'PROFESSIONAL',
        postingFrequency: dto.postingFrequency ?? 'THREE_TIMES_WEEK',
        preferredDays: dto.preferredDays ?? [],
        timezone: dto.timezone ?? 'UTC',
        targetAudience: dto.targetAudience,
        writingExamples: dto.writingExamples ?? [],
        avoidTopics: dto.avoidTopics ?? [],
        emailNotifications: dto.emailNotifications ?? true,
        reminderEnabled: dto.reminderEnabled ?? true,
        reminderLeadHours: dto.reminderLeadHours ?? 1,
      },
    });
  }
}
