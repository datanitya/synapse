import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ImagesService } from '../images/images.service';
import { BrandMemoryService } from '../brand-memory/brand-memory.service';
import { AnalyticsService } from '../../common/analytics/analytics.service';
import { ToneStyle, PostingGoal, UserPreferences, ContentType } from '@prisma/client';

const TONE_DESCRIPTIONS: Record<ToneStyle, string> = {
  PROFESSIONAL: 'formal, authoritative, data-driven',
  CONVERSATIONAL: 'warm, approachable, first-person storytelling',
  THOUGHT_LEADER: 'bold opinions, forward-thinking, challenges status quo',
  STORYTELLER: 'narrative-driven, personal anecdotes, emotional connection',
  EDUCATIONAL: 'clear explanations, step-by-step insights, teaching mindset',
  INSPIRATIONAL: 'motivational, uplifting, action-oriented',
};

const GOAL_LABELS: Record<PostingGoal, string> = {
  GROW_NETWORK: 'grow professional network',
  ESTABLISH_EXPERTISE: 'establish thought leadership',
  ATTRACT_CLIENTS: 'attract new clients',
  FIND_JOB: 'find new job opportunities',
  BUILD_COMMUNITY: 'build an engaged community',
  SHARE_LEARNINGS: 'share knowledge and learnings',
};

const VariationsSchema = z.object({
  variations: z.array(
    z.object({
      index: z.number(),
      label: z.string(),
      content: z.string(),
    }),
  ).length(3),
});

const BlogSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string().nullable().optional(),
      content: z.string(),
    }),
  ).min(1),
});

const ImageSchema = z.object({
  imagePrompt: z.string(),
  caption: z.string(),
});

function buildVoiceParams(prefs: UserPreferences): string {
  const p = prefs as unknown as Record<string, string | undefined>;
  const lines: string[] = [];
  if (p.hookStyle) lines.push(`- Hook style: ${p.hookStyle}`);
  if (p.writingStyle) lines.push(`- Writing style: ${p.writingStyle}`);
  if (p.sentenceLength) lines.push(`- Sentence length: ${p.sentenceLength}`);
  if (p.ctaStyle) lines.push(`- CTA style: ${p.ctaStyle}`);
  if (p.valueProposition) lines.push(`- Value proposition: ${p.valueProposition}`);
  return lines.length ? '\nVOICE PARAMETERS:\n' + lines.join('\n') + '\n' : '';
}

export interface GeneratePostOptions {
  topic: string;
  trendId?: string;
  customContext?: string;
  contentType?: 'POST' | 'BLOG' | 'IMAGE';
}

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private images: ImagesService,
    private brandMemory: BrandMemoryService,
    private analytics: AnalyticsService,
  ) {}

  async generatePost(userId: string, options: GeneratePostOptions) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    const prefs = user?.preferences;

    const trend = options.trendId
      ? await this.prisma.trend.findUnique({ where: { id: options.trendId } })
      : null;

    let trendContext = '';
    if (trend) {
      const intel = (trend as Record<string, unknown>).intelligence as {
        trendScore?: number; opportunityScore?: number;
        whyItMatters?: string; suggestedAngle?: string;
        suggestedHook?: string; suggestedTone?: string; suggestedAudience?: string;
      } | null;

      trendContext = `\nSOURCE TREND:\n- Title: ${trend.title}\n- Study note: ${trend.summary ?? ''}\n`;

      if (intel) {
        trendContext += `\nTREND INTELLIGENCE (use to inform the post — do NOT quote these verbatim):\n`;
        if (intel.trendScore) trendContext += `- Trend momentum: ${intel.trendScore}/10\n`;
        if (intel.opportunityScore) trendContext += `- Opportunity score: ${intel.opportunityScore}/10\n`;
        if (intel.whyItMatters) trendContext += `- Why it matters: ${intel.whyItMatters}\n`;
        if (intel.suggestedAngle) trendContext += `- Recommended angle: ${intel.suggestedAngle}\n`;
        if (intel.suggestedHook) trendContext += `- Suggested hook: ${intel.suggestedHook}\n`;
        if (intel.suggestedTone) trendContext += `- Recommended tone: ${intel.suggestedTone}\n`;
        if (intel.suggestedAudience) trendContext += `- Target audience: ${intel.suggestedAudience}\n`;
      } else if (trend.score > 0) {
        trendContext += `- Trending: ${trend.score} upvotes with ${trend.commentCount} comments\n`;
      }
    }

    const brandDna = await this.brandMemory.getDna(userId);
    const systemPrompt = this.buildSystemPrompt(prefs, brandDna);
    const userPrompt = this.buildUserPrompt(options.topic, trendContext, options.customContext);

    const raw = await this.ai.chat(systemPrompt, userPrompt, 'generation', userId, 'generation');
    const parsed = this.parseVariations(raw);

    const generationParams = {
      topic: options.topic,
      trendId: options.trendId,
      customContext: options.customContext,
      nicheProfile: prefs?.niches ?? [],
      toneStyle: prefs?.toneStyle,
    };

    const draft = await this.prisma.draft.create({
      data: {
        userId,
        trendId: options.trendId,
        sourceUrl: trend?.url,
        sourceTitle: trend?.title,
        generationParams,
        contentType: ContentType.POST,
        suggestedPostAt: this.computeNextSlot(prefs?.timezone ?? 'UTC'),
        variations: {
          create: parsed.variations.map((v) => ({
            index: v.index,
            label: v.label,
            content: v.content,
          })),
        },
      },
      include: { variations: true },
    });

    this.analytics.capture(userId, 'draft_generated', {
      contentType: 'POST',
      trendId: options.trendId ?? null,
      draftId: draft.id,
    });

    return draft;
  }

  async generateBlog(userId: string, options: GeneratePostOptions) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    const prefs = user?.preferences;
    let trendContext = '';

    if (options.trendId) {
      const trend = await this.prisma.trend.findUnique({ where: { id: options.trendId } });
      if (trend) {
        trendContext = `\nSOURCE TREND:\n- Title: ${trend.title}\n- Summary: ${trend.summary ?? ''}\n`;
      }
    }

    const systemPrompt = this.buildBlogSystemPrompt(prefs);
    const userPrompt = this.buildBlogUserPrompt(options.topic, trendContext, options.customContext);

    const raw = await this.ai.chat(systemPrompt, userPrompt, 'generation', userId, 'blog_generation', 4000);
    const parsed = this.parseBlog(raw);

    const finalContent = parsed.sections
      .map((s) => (s.heading ? `## ${s.heading}\n\n${s.content}` : s.content))
      .join('\n\n');

    const generationParams = {
      topic: options.topic,
      trendId: options.trendId,
      customContext: options.customContext,
      nicheProfile: prefs?.niches ?? [],
      toneStyle: prefs?.toneStyle,
    };

    const draft = await this.prisma.draft.create({
      data: {
        userId,
        trendId: options.trendId,
        generationParams,
        contentType: ContentType.BLOG,
        title: parsed.title,
        finalContent,
        suggestedPostAt: this.computeNextSlot(prefs?.timezone ?? 'UTC'),
        variations: {
          create: [{ index: 0, label: 'Article', content: finalContent, selected: true }],
        },
      },
      include: { variations: true },
    });

    return draft;
  }

  private buildSystemPrompt(
    prefs: UserPreferences | null | undefined,
    brandDna?: { hookStyle?: string | null; tone?: string | null; paragraphLength?: string | null; emojiUsage?: string | null; preferredTopics?: string[]; avgPostLength?: number | null; samplesAnalyzed?: number } | null,
  ): string {
    const profileSection = prefs
      ? `CREATOR PROFILE:
- Niches: ${prefs.niches.join(', ')}
- Goals: ${prefs.goals.map((g) => GOAL_LABELS[g]).join(', ')}
- Writing tone: ${TONE_DESCRIPTIONS[prefs.toneStyle]}
- Topics to avoid: ${prefs.avoidTopics.join(', ') || 'none'}
- Target audience: ${prefs.targetAudience ?? 'LinkedIn professionals'}
${buildVoiceParams(prefs)}${
  prefs.writingExamples.length > 0
    ? `\nVOICE EXAMPLES (posts this creator has written):\n${prefs.writingExamples.map((ex, i) => `Example ${i + 1}:\n${ex.slice(0, 400)}`).join('\n\n')}`
    : ''
}`
      : 'CREATOR PROFILE: Professional LinkedIn content creator.';

    const dnaSection =
      brandDna && (brandDna.samplesAnalyzed ?? 0) >= 3
        ? `\nLEARNED BRAND DNA (inferred from ${brandDna.samplesAnalyzed} past edits — follow this closely):
${brandDna.hookStyle ? `- Hook style: ${brandDna.hookStyle}` : ''}
${brandDna.tone ? `- Tone: ${brandDna.tone}` : ''}
${brandDna.paragraphLength ? `- Paragraph length: ${brandDna.paragraphLength}` : ''}
${brandDna.emojiUsage ? `- Emoji usage: ${brandDna.emojiUsage}` : ''}
${brandDna.preferredTopics?.length ? `- Preferred topics: ${brandDna.preferredTopics.join(', ')}` : ''}
${brandDna.avgPostLength ? `- Typical post length: ~${brandDna.avgPostLength} words` : ''}`
        : '';

    return `You are a ghostwriter specializing in LinkedIn content for professionals. Your job is to write posts that sound authentically human, match the creator's voice exactly, and drive meaningful engagement.

LinkedIn post rules you ALWAYS follow:
- Never use corporate jargon ("synergize", "leverage", "circle back", "deep dive", "ecosystem")
- Start with a hook that stops the scroll (surprising stat, bold claim, or relatable moment)
- Write in short paragraphs (1-3 lines max per paragraph)
- Use line breaks liberally for mobile readability
- End with ONE clear call to action or question — never multiple
- Do not add hashtags unless explicitly asked
- Keep posts between 150-300 words unless examples show otherwise
- Never start with "I" as the first word
- Sound like a smart human, not an AI

${profileSection}${dnaSection}`;
  }

  private buildUserPrompt(topic: string, trendContext: string, customContext?: string): string {
    return `${trendContext}${customContext ? `\nADDITIONAL CONTEXT: ${customContext}\n` : ''}
Generate exactly 3 LinkedIn post variations about: "${topic}"

Each variation must take a DIFFERENT angle:
- Variation 0 — "Direct Insight": Lead with the key takeaway immediately. Professional, punchy.
- Variation 1 — "Story Hook": Start with a personal moment or anecdote that leads into the insight.
- Variation 2 — "Provocative Question": Open with a question that challenges conventional thinking.

Return ONLY valid JSON matching this exact schema, no markdown:
{"variations":[{"index":0,"label":"Direct Insight","content":"..."},{"index":1,"label":"Story Hook","content":"..."},{"index":2,"label":"Provocative Question","content":"..."}]}`;
  }

  private parseVariations(raw: string) {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = VariationsSchema.parse(JSON.parse(cleaned));
    return parsed;
  }

  async generateImagePost(userId: string, options: GeneratePostOptions) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });
    const prefs = user?.preferences;

    const systemPrompt = this.buildImageSystemPrompt(prefs);
    const userPrompt = `Topic: "${options.topic}"${options.customContext ? `\nAdditional context: ${options.customContext}` : ''}

Return ONLY valid JSON (no markdown):
{"imagePrompt":"detailed visual description for image generation","caption":"engaging LinkedIn caption"}`;

    const raw = await this.ai.chat(systemPrompt, userPrompt, 'generation', userId, 'image_generation');
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = ImageSchema.parse(JSON.parse(cleaned));

    const buffer = await this.ai.generateImage(parsed.imagePrompt, userId);
    const imageUrl = await this.images.uploadBuffer(buffer, userId);

    const draft = await this.prisma.draft.create({
      data: {
        userId,
        generationParams: { topic: options.topic, customContext: options.customContext, imagePrompt: parsed.imagePrompt },
        contentType: ContentType.IMAGE,
        imageUrl,
        finalContent: parsed.caption,
        suggestedPostAt: this.computeNextSlot(prefs?.timezone ?? 'UTC'),
        variations: {
          create: [{ index: 0, label: 'Caption', content: parsed.caption, selected: true }],
        },
      },
      include: { variations: true },
    });

    return draft;
  }

  private buildImageSystemPrompt(prefs: UserPreferences | null | undefined): string {
    const profileSection = prefs
      ? `CREATOR PROFILE:
- Niches: ${prefs.niches.join(', ')}
- Goals: ${prefs.goals.map((g) => GOAL_LABELS[g]).join(', ')}
- Writing tone: ${TONE_DESCRIPTIONS[prefs.toneStyle]}
- Target audience: ${prefs.targetAudience ?? 'LinkedIn professionals'}`
      : 'CREATOR PROFILE: Professional LinkedIn content creator.';

    return `You are a creative director specializing in LinkedIn visual content. You pair compelling image concepts with engaging captions.

Image prompt rules:
- Be specific and descriptive: composition, style, mood, lighting, colors
- Clean, professional aesthetic suitable for LinkedIn
- No text in the image
- Think: what image would stop someone mid-scroll?

Caption rules:
- 1-3 short, punchy sentences maximum
- Match the creator's voice and goals
- End with a question or insight that invites engagement
- No hashtags

${profileSection}`;
  }

  private buildBlogSystemPrompt(prefs: UserPreferences | null | undefined): string {
    const profileSection = prefs
      ? `CREATOR PROFILE:
- Niches: ${prefs.niches.join(', ')}
- Goals: ${prefs.goals.map((g) => GOAL_LABELS[g]).join(', ')}
- Writing tone: ${TONE_DESCRIPTIONS[prefs.toneStyle]}
- Topics to avoid: ${prefs.avoidTopics.join(', ') || 'none'}
- Target audience: ${prefs.targetAudience ?? 'LinkedIn professionals'}`
      : 'CREATOR PROFILE: Professional thought leader.';

    return `You are an expert content writer specializing in long-form LinkedIn articles and thought leadership blog posts. Your writing is structured, substantive, and demonstrates deep expertise.

Long-form article rules you ALWAYS follow:
- Use a compelling headline as the title
- Structure with clear sections (provided as heading + content pairs)
- First section: no heading — use it as an executive summary or strong thesis (2-4 sentences)
- Each subsequent section: 2-4 substantive paragraphs
- Include a practical "Takeaways" or "What this means" section near the end
- Close with a strong conclusion that reinforces the thesis
- Target length: 600-1200 words total across all sections
- Sound authoritative and human, never AI-generated
- No corporate jargon, no hollow buzzwords

${profileSection}`;
  }

  private buildBlogUserPrompt(topic: string, trendContext: string, customContext?: string): string {
    return `${trendContext}${customContext ? `\nADDITIONAL CONTEXT: ${customContext}\n` : ''}
Write a long-form LinkedIn article about: "${topic}"

Return ONLY valid JSON (no markdown), exactly this structure:
{"title":"Compelling article headline (max 12 words)","sections":[{"heading":null,"content":"Executive summary paragraph..."},{"heading":"Section Heading","content":"Section body..."},{"heading":"Another Section","content":"Section body..."},{"heading":"Key Takeaways","content":"Practical takeaways..."},{"heading":"Conclusion","content":"Closing paragraph..."}]}

The first section must have heading: null. All other sections must have a heading string.`;
  }

  private parseBlog(raw: string) {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = BlogSchema.parse(JSON.parse(cleaned));
    return parsed;
  }

  // Returns the next Tue/Wed/Thu at 8am, noon, or 5pm in the user's local timezone.
  private computeNextSlot(timezone: string): Date {
    const OPTIMAL_DAYS = new Set([2, 3, 4]); // Tue=2, Wed=3, Thu=4
    const OPTIMAL_HOURS = [8, 12, 17];

    const now = new Date();
    const cutoff = new Date(now.getTime() + 60 * 60 * 1000);

    // UTC offset in ms for the target timezone at a given instant (positive = ahead of UTC).
    const getOffsetMs = (date: Date): number => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).formatToParts(date).reduce<Record<string, string>>((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = p.value;
        return acc;
      }, {});
      const localAsUtcMs = Date.UTC(
        +parts.year, +parts.month - 1, +parts.day,
        +parts.hour % 24, +parts.minute, +parts.second,
      );
      return localAsUtcMs - date.getTime();
    };

    for (let d = 0; d <= 14; d++) {
      const probe = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      // Recompute offset per day so DST transitions are handled correctly
      const offsetMs = getOffsetMs(probe);
      const localProbe = new Date(probe.getTime() + offsetMs);
      const dow = localProbe.getUTCDay();
      if (!OPTIMAL_DAYS.has(dow)) continue;

      // UTC ms of local midnight on this day
      const localMidnightUtcMs =
        Date.UTC(localProbe.getUTCFullYear(), localProbe.getUTCMonth(), localProbe.getUTCDate()) - offsetMs;

      for (const hour of OPTIMAL_HOURS) {
        const candidate = new Date(localMidnightUtcMs + hour * 3600 * 1000);
        if (candidate > cutoff) return candidate;
      }
    }

    // Fallback: 4 days from now at noon UTC
    const fallback = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    fallback.setUTCHours(12, 0, 0, 0);
    return fallback;
  }
}
