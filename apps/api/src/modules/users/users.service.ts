import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { preferences: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Strip OAuth tokens — never send encrypted tokens to the client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken, refreshToken, tokenExpiresAt, ...safeUser } = user;

    // Mask encrypted credential fields — never return raw keys to the client
    if (safeUser.preferences) {
      const prefs = safeUser.preferences as Record<string, unknown>;
      return {
        ...safeUser,
        preferences: {
          ...prefs,
          openaiApiKey: undefined,
          geminiApiKey: undefined,
          anthropicApiKey: undefined,
          linkedinClientSecret: undefined,
          hasOpenaiKey: !!prefs.openaiApiKey,
          hasGeminiKey: !!prefs.geminiApiKey,
          hasAnthropicKey: !!prefs.anthropicApiKey,
          hasLinkedinSecret: !!prefs.linkedinClientSecret,
        },
      };
    }
    return safeUser;
  }

  async updateCredentials(userId: string, dto: UpdateCredentialsDto) {
    const data: Record<string, unknown> = {};

    if (dto.aiProvider !== undefined) data.aiProvider = dto.aiProvider;
    if (dto.aiModel !== undefined) data.aiModel = dto.aiModel;
    // Empty string or null means "clear the stored key"; a non-empty string means "set a new key"
    if (dto.openaiApiKey !== undefined) data.openaiApiKey = dto.openaiApiKey ? this.encrypt(dto.openaiApiKey) : null;
    if (dto.geminiApiKey !== undefined) data.geminiApiKey = dto.geminiApiKey ? this.encrypt(dto.geminiApiKey) : null;
    if (dto.anthropicApiKey !== undefined) data.anthropicApiKey = dto.anthropicApiKey ? this.encrypt(dto.anthropicApiKey) : null;
    if (dto.linkedinClientId !== undefined) data.linkedinClientId = dto.linkedinClientId;
    if (dto.linkedinClientSecret !== undefined) data.linkedinClientSecret = dto.linkedinClientSecret ? this.encrypt(dto.linkedinClientSecret) : null;
    if (dto.linkedinCompanyId !== undefined) data.linkedinCompanyId = dto.linkedinCompanyId;

    try {
      await this.prisma.userPreferences.update({ where: { userId }, data });
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException('User preferences not found. Complete onboarding first.');
      throw e;
    }

    return { saved: true };
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

  private encrypt(text: string): string { return this.crypto.encrypt(text); }
  private decrypt(text: string): string { return this.crypto.decrypt(text); }
}
