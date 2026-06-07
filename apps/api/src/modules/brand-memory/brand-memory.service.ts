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

  async analyzeDna(userId: string) {
    const edits = await this.prisma.contentEdit.findMany({
      where: { userId },
      orderBy: { editedAt: 'desc' },
      take: 15,
    });

    if (edits.length < 3) {
      return { analyzed: false, reason: 'Not enough edits yet (need at least 3)' };
    }

    const editSamples = edits
      .map((e, i) =>
        `EDIT ${i + 1}:\nOriginal (AI):\n${e.original.slice(0, 500)}\n\nUser's version:\n${e.edited.slice(0, 500)}`,
      )
      .join('\n\n---\n\n');

    const system = `You are a writing style analyst. You will receive pairs of AI-generated LinkedIn posts and the human-edited versions. Analyze the patterns in what the user changes to infer their writing DNA.`;

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
