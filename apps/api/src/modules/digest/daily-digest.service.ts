import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from './email.service';

@Injectable()
export class DailyDigestService {
  private readonly logger = new Logger(DailyDigestService.name);

  constructor(
    private prisma: PrismaService,
    private content: ContentService,
    private notifications: NotificationsService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  // Runs every day at 8:00 AM IST
  @Cron('0 8 * * *', { timeZone: 'Asia/Kolkata' })
  async runDailyDigest(): Promise<void> {
    this.logger.log('Daily digest cron triggered');

    const users = await this.prisma.user.findMany({
      where: {
        onboardingComplete: true,
        preferences: { emailNotifications: true },
      },
      include: { preferences: true },
    });

    this.logger.log(`Sending digest to ${users.length} user(s)`);

    for (const user of users) {
      try {
        await this.sendDigestForUser(user.id, user.email);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Digest failed for user ${user.id}: ${msg}`);
      }
    }
  }

  async sendDigestForUser(userId: string, email: string): Promise<void> {
    const trend = await this.prisma.trend.findFirst({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { score: 'desc' },
    });

    if (!trend) {
      this.logger.warn('No active trends found — skipping digest');
      return;
    }

    const draft = await this.content.generatePost(userId, {
      topic: trend.title,
      trendId: trend.id,
    });

    const webUrl = this.config.get<string>('webUrl') ?? 'http://localhost:3000';

    await this.email.sendDailyDigest(email, {
      trendTitle: trend.title,
      trendUrl: trend.url ?? undefined,
      variations: draft.variations.map((v) => ({ label: v.label, content: v.content })),
      draftId: draft.id,
      webUrl,
    });

    await this.notifications.create({
      userId,
      type: 'DRAFT_READY',
      title: 'Your daily post is ready',
      body: `Generated from: ${trend.title}`,
      metadata: { draftId: draft.id, trendId: trend.id },
    });

    this.logger.log(`Digest sent → ${email} (draft ${draft.id})`);
  }

  // Callable manually via POST /digest/trigger (for testing)
  async triggerForUser(userId: string): Promise<{ draftId: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.sendDigestForUser(user.id, user.email);
    const draft = await this.prisma.draft.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { draftId: draft!.id };
  }
}
