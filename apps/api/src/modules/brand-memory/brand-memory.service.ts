import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

const DnaSchema = z.object({
  hookStyle: z.string().optional(),
  tone: z.string().optional(),
  paragraphLength: z.enum(['short', 'medium', 'long']).optional(),
  emojiUsage: z.enum(['none', 'low', 'medium', 'high']).optional(),
  preferredTopics: z.array(z.string()).optional(),
  avgPostLength: z.number().optional(),
  summary: z.string().optional(),
});

@Injectable()
export class BrandMemoryService {
  private readonly logger = new Logger(BrandMemoryService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  async getDna(userId: string) {
    return this.prisma.brandDna.findUnique({ where: { userId } });
  }

  // ─── Brand Score ─────────────────────────────────────────────────────────────

  async computeBrandScore(userId: string): Promise<number> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dna, publishedCount, prefs] = await Promise.all([
      this.prisma.brandDna.findUnique({ where: { userId } }),
      this.prisma.draft.count({
        where: { userId, status: 'PUBLISHED', postedAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.userPreferences.findUnique({ where: { userId } }),
    ]);

    let score = 0;

    // DNA richness (0-40 pts): more analyzed edits = richer voice model
    const samples = dna?.samplesAnalyzed ?? 0;
    if (samples >= 15) score += 40;
    else if (samples >= 10) score += 30;
    else if (samples >= 5)  score += 20;
    else if (samples >= 3)  score += 10;

    // Post frequency in last 30 days (0-30 pts)
    if (publishedCount >= 8) score += 30;
    else if (publishedCount >= 4) score += 20;
    else if (publishedCount >= 2) score += 12;
    else if (publishedCount >= 1) score += 6;

    // Profile completeness (0-30 pts): each meaningful field filled
    if (prefs) {
      if ((prefs.niches?.length ?? 0) > 0) score += 6;
      if ((prefs.goals?.length ?? 0) > 0) score += 6;
      if (prefs.targetAudience) score += 6;
      if ((prefs.writingExamples?.length ?? 0) > 0) score += 6;
      if ((prefs.avoidTopics?.length ?? 0) > 0) score += 3;
      if (prefs.hookStyle || prefs.writingStyle) score += 3;
    }

    return Math.min(score, 100);
  }

  async getBrandScore(userId: string) {
    const score = await this.computeBrandScore(userId);
    const dna = await this.prisma.brandDna.findUnique({
      where: { userId },
      select: { samplesAnalyzed: true, brandScore: true },
    });

    return {
      score,
      samplesAnalyzed: dna?.samplesAnalyzed ?? 0,
      level:
        score >= 80 ? 'Expert'
        : score >= 60 ? 'Established'
        : score >= 40 ? 'Growing'
        : score >= 20 ? 'Emerging'
        : 'New',
      nextMilestone: this.nextMilestone(score),
    };
  }

  private nextMilestone(score: number): string {
    if (score < 20) return 'Complete your profile and publish your first post to reach Emerging';
    if (score < 40) return 'Publish 2 posts this month and analyze 3+ edits to reach Growing';
    if (score < 60) return 'Keep posting consistently and add more writing examples to reach Established';
    if (score < 80) return 'Publish 8+ posts this month with a complete profile to reach Expert';
    return 'You\'re at Expert level — keep the momentum going';
  }

  // ─── Voice Report ─────────────────────────────────────────────────────────────

  async getVoiceReport(userId: string) {
    const dna = await this.prisma.brandDna.findUnique({ where: { userId } });
    return {
      report: dna?.voiceReport ?? null,
      updatedAt: dna?.voiceReportUpdatedAt ?? null,
    };
  }

  async generateVoiceReport(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [dna, publishedDrafts, analytics] = await Promise.all([
      this.prisma.brandDna.findUnique({ where: { userId } }),
      this.prisma.draft.findMany({
        where: { userId, status: 'PUBLISHED', postedAt: { gte: thirtyDaysAgo } },
        select: { id: true, finalContent: true, contentType: true, postedAt: true, variations: { select: { label: true, selected: true } } },
        orderBy: { postedAt: 'desc' },
        take: 10,
      }),
      this.prisma.postAnalytics.findMany({
        where: { draft: { userId } },
        orderBy: { fetchedAt: 'desc' },
        take: 10,
      }),
    ]);

    const postCount = publishedDrafts.length;
    const hasEngagement = analytics.length > 0;

    const postsContext = publishedDrafts
      .map((d, i) => {
        const perf = analytics.find((a) => a.draftId === d.id);
        const variation = d.variations.find((v) => v.selected)?.label ?? 'unknown';
        const engagementStr = perf
          ? `(${perf.likes} likes, ${perf.comments} comments, ${perf.impressions} impressions)`
          : '';
        return `Post ${i + 1} [${variation}]: ${d.finalContent?.slice(0, 200) ?? ''}… ${engagementStr}`;
      })
      .join('\n\n');

    const dnaContext = dna
      ? `Writing DNA: hook=${dna.hookStyle ?? 'unknown'}, tone=${dna.tone ?? 'unknown'}, paragraphs=${dna.paragraphLength ?? 'unknown'}, emojis=${dna.emojiUsage ?? 'unknown'}`
      : 'No Brand DNA analyzed yet.';

    const system = `You are a LinkedIn brand strategist giving a creator their weekly Voice Report. Be specific, data-driven, and actionable. Speak directly to the creator in second person. Keep it under 150 words.`;

    const userPrompt = `Generate a Voice Report for this creator.

${dnaContext}
Posts published this month: ${postCount}
${postsContext ? `\nRecent posts:\n${postsContext}` : ''}
${hasEngagement ? 'Engagement data included above.' : 'No engagement data available yet.'}

Write 3-4 sentences covering:
1. What content pattern is working (or what to try if no data yet)
2. One specific observation about their voice
3. One concrete action for next week`;

    const report = await this.ai.chat(system, userPrompt, 'generation', userId, 'voice_report');

    await this.prisma.brandDna.upsert({
      where: { userId },
      update: { voiceReport: report, voiceReportUpdatedAt: new Date() },
      create: {
        userId,
        voiceReport: report,
        voiceReportUpdatedAt: new Date(),
        preferredTopics: [],
        samplesAnalyzed: 0,
      },
    });

    return { report, updatedAt: new Date() };
  }

  // Weekly voice report for all active users (Sunday 5 AM)
  @Cron('0 5 * * 0')
  async weeklyVoiceReports() {
    this.logger.log('Generating weekly Voice Reports');
    const users = await this.prisma.user.findMany({
      where: { onboardingComplete: true },
      select: { id: true },
    });

    for (const user of users) {
      try {
        await this.generateVoiceReport(user.id);
      } catch (err: unknown) {
        if (err instanceof HttpException && err.getStatus() === 429) {
          this.logger.log(`Skipping voice report for ${user.id} — token limit reached`);
        } else {
          this.logger.warn(`Voice report failed for ${user.id}: ${String(err)}`);
        }
      }
    }
  }

  // ─── Brand DNA Analysis ──────────────────────────────────────────────────────

  async analyzeDna(userId: string) {
    const edits = await this.prisma.contentEdit.findMany({
      where: { userId },
      orderBy: { editedAt: 'desc' },
      take: 15,
      include: {
        // Weight edits from high-performing posts more heavily
        // by including PostAnalytics data for the draft
      },
    });

    if (edits.length < 3) {
      return { analyzed: false, reason: 'Not enough edits yet (need at least 3)' };
    }

    // Fetch engagement data for posts that had edits
    const draftIds = [...new Set(edits.map((e) => e.draftId))];
    const analyticsMap = new Map(
      (
        await this.prisma.postAnalytics.findMany({
          where: { draftId: { in: draftIds } },
          select: { draftId: true, likes: true, comments: true, impressions: true },
        })
      ).map((a) => [a.draftId, a]),
    );

    // Build edit samples — high-performing posts get a [HIGH ENGAGEMENT] label
    const editSamples = edits
      .map((e, i) => {
        const perf = analyticsMap.get(e.draftId);
        const engagementTag =
          perf && perf.likes + perf.comments >= 10 ? '[HIGH ENGAGEMENT] ' : '';
        return `EDIT ${i + 1}${engagementTag ? ' ' + engagementTag : ''}:\nOriginal (AI):\n${e.original.slice(0, 500)}\n\nUser's version:\n${e.edited.slice(0, 500)}`;
      })
      .join('\n\n---\n\n');

    const system = `You are a writing style analyst. You will receive pairs of AI-generated LinkedIn posts and the human-edited versions. Posts marked [HIGH ENGAGEMENT] performed significantly better — pay extra attention to those edits. Analyze the patterns in what the user changes to infer their writing DNA.`;

    const user = `Analyze these ${edits.length} edit pairs and infer the user's writing style DNA.

${editSamples}

Return ONLY valid JSON (no markdown) matching this schema:
{
  "hookStyle": "contrarian|personal-story|data-driven|question|listicle",
  "tone": "professional|conversational|thought-leader|storyteller|educational|inspirational",
  "paragraphLength": "short|medium|long",
  "emojiUsage": "none|low|medium|high",
  "preferredTopics": ["topic1", "topic2"],
  "avgPostLength": 200,
  "summary": "one sentence describing their writing style"
}`;

    const raw = await this.ai.chat(system, user, 'categorization', userId, 'brand_dna_analysis');
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = DnaSchema.parse(JSON.parse(cleaned));

    const score = await this.computeBrandScore(userId);

    const dna = await this.prisma.brandDna.upsert({
      where: { userId },
      update: {
        hookStyle: parsed.hookStyle,
        tone: parsed.tone,
        paragraphLength: parsed.paragraphLength,
        emojiUsage: parsed.emojiUsage,
        preferredTopics: parsed.preferredTopics ?? [],
        avgPostLength: parsed.avgPostLength,
        samplesAnalyzed: edits.length,
        rawDna: parsed as object,
        brandScore: score,
      },
      create: {
        userId,
        hookStyle: parsed.hookStyle,
        tone: parsed.tone,
        paragraphLength: parsed.paragraphLength,
        emojiUsage: parsed.emojiUsage,
        preferredTopics: parsed.preferredTopics ?? [],
        avgPostLength: parsed.avgPostLength,
        samplesAnalyzed: edits.length,
        rawDna: parsed as object,
        brandScore: score,
      },
    });

    return { analyzed: true, dna, summary: parsed.summary };
  }

  // Weekly: analyze only users who have ≥ 3 new edits since their last DNA update
  @Cron(CronExpression.EVERY_WEEK)
  async weeklyAnalysis() {
    this.logger.log('Running weekly Brand DNA analysis');
    const candidates = await this.prisma.user.findMany({
      where: { contentEdits: { some: {} } },
      select: { id: true, brandDna: { select: { updatedAt: true } } },
    });

    for (const user of candidates) {
      const since = user.brandDna?.updatedAt ?? new Date(0);
      const newEdits = await this.prisma.contentEdit.count({
        where: { userId: user.id, editedAt: { gt: since } },
      });
      if (newEdits < 3) continue;
      try {
        await this.analyzeDna(user.id);
      } catch (err: unknown) {
        if (err instanceof HttpException && err.getStatus() === 429) {
          this.logger.log(`Skipping Brand DNA for ${user.id} — monthly token limit reached`);
        } else {
          this.logger.warn(`Brand DNA analysis failed for ${user.id}: ${String(err)}`);
        }
      }
    }
  }
}
