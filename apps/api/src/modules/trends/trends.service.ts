import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { HackerNewsService } from './hackernews.service';
import { GoogleNewsService, NewsArticle, DEFAULT_NICHE_QUERIES } from './google-news.service';
import { LinkedInService } from './linkedin.service';
import { TrendSource } from '@prisma/client';

const TREND_TTL_HOURS = 48;
const MIN_PROFESSIONAL_RELEVANCE = 6;
const MAX_NICHE_QUERIES = 6;
/** Max articles sent to AI per sync — Phase A (keyword) processes all; Phase B (AI) is capped */
const MAX_ARTICLES_PER_SYNC = 30;
const BATCH_SIZE = 5;
const INTER_BATCH_DELAY_MS = 2000;

// ─── Static lookup tables ─────────────────────────────────────────────────────

const NICHE_AFFINITIES: Record<string, Record<string, number>> = {
  'AI/ML Engineer':    { 'AI/ML': 1.0, Data: 0.8, Engineering: 0.7, Cloud: 0.5, 'Open Source': 0.6 },
  'Product Manager':   { Product: 1.0, Startup: 0.8, Design: 0.7, 'AI/ML': 0.6, Leadership: 0.5 },
  'Software Engineer': { Engineering: 1.0, 'Web Dev': 0.9, Cloud: 0.8, 'Open Source': 0.7, 'AI/ML': 0.5 },
  'Founder':           { Startup: 1.0, Leadership: 0.9, Finance: 0.7, Product: 0.8, Career: 0.5 },
  'Marketer':          { Product: 0.8, Startup: 0.7, Design: 0.6, Leadership: 0.5, Career: 0.6 },
  'Designer':          { Design: 1.0, 'Web Dev': 0.8, Product: 0.7, 'Mobile Dev': 0.6 },
  'Data Scientist':    { 'AI/ML': 1.0, Data: 1.0, Engineering: 0.7, Cloud: 0.6, 'Open Source': 0.5 },
  'Consultant':        { Leadership: 0.9, Career: 0.8, Startup: 0.7, Finance: 0.7, Product: 0.5 },
  'Recruiter':         { Career: 1.0, Leadership: 0.7, Startup: 0.6, Product: 0.4 },
  'Educator':          { 'AI/ML': 0.7, Engineering: 0.6, Product: 0.5, Career: 0.8, 'Open Source': 0.6 },
};

/** Keyword phrases for each category — matched against lowercased article title */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'AI/ML':        ['artificial intelligence', 'machine learning', 'deep learning', 'large language', 'llm', 'gpt', 'neural network', 'openai', 'anthropic', 'gemini', 'chatgpt', 'claude ai', ' ai ', 'generative ai', 'foundation model'],
  'Engineering':  ['software engineer', 'developer', 'programming', 'backend', 'frontend', 'devops', 'microservice', 'compiler', 'runtime', 'tech debt', 'refactor', 'codebase', 'api design'],
  'Product':      ['product manager', 'product management', 'product roadmap', 'product launch', 'product strategy', 'saas', 'b2b product', 'feature flag', 'user story'],
  'Startup':      ['startup', 'founder', 'venture capital', 'series a', 'series b', 'seed round', 'y combinator', 'ycombinator', 'ipo', 'unicorn', 'bootstrapped', 'fundraising'],
  'Leadership':   ['leadership', 'management', 'ceo', 'executive', 'org design', 'company culture', 'team building', 'strategy'],
  'Career':       ['career', 'job market', 'hiring', 'interview', 'salary', 'remote work', 'layoff', 'job search', 'recruiter', 'linkedin'],
  'Design':       ['ux design', 'ui design', 'product design', 'figma', 'user experience', 'design system', 'usability', 'prototyp'],
  'Cloud':        ['aws', 'azure', 'google cloud', 'kubernetes', 'docker', 'serverless', 'infrastructure', 'cloud computing', 'devops'],
  'Data':         ['data science', 'data engineering', 'analytics', 'data pipeline', 'data warehouse', 'sql', 'dbt', 'spark', 'big data'],
  'Security':     ['cybersecurity', 'data breach', 'vulnerability', 'cyber attack', 'ransomware', 'privacy', 'zero-day', 'exploit'],
  'Web Dev':      ['javascript', 'typescript', 'react', 'next.js', 'vue', 'angular', 'css', 'web development', 'fullstack', 'node.js'],
  'Mobile Dev':   ['ios', 'android', 'flutter', 'swift', 'kotlin', 'mobile app', 'react native'],
  'Open Source':  ['open source', 'open-source', 'github', 'open source project'],
  'Finance':      ['revenue', 'valuation', 'investment', 'stock market', 'profit margin', 'funding round', 'market cap'],
  'Productivity': ['productivity', 'workflow automation', 'time management', 'efficiency', 'second brain', 'note-taking'],
};

const PROFESSIONAL_CATEGORIES = new Set([
  'AI/ML', 'Product', 'Engineering', 'Startup', 'Leadership', 'Career', 'Data', 'Cloud',
]);

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TrendIntelligence {
  trendScore: number;
  saturationScore: number;
  opportunityScore: number;
  whyItMatters: string;
  suggestedAngle: string;
  suggestedHook: string;
  suggestedTone: string;
  suggestedAudience: string;
}

interface CategorizationResult {
  id: string;
  categories: string[];
  professionalRelevance: number;
  summary: string;
  intelligence: TrendIntelligence;
}

/** Returned by AI — only summary + intelligence (categories/relevance come from keyword phase) */
interface AiEnrichmentResult {
  id: string;
  summary: string;
  intelligence: TrendIntelligence;
}

interface ArticleItem {
  id: string;
  title: string;
  source: string;
  score?: number;
}

// ─── AI system prompt ─────────────────────────────────────────────────────────

const INTELLIGENCE_SYSTEM_PROMPT = `You are SYNAPSE — a Trend Intelligence Engine for LinkedIn personal brand growth.

Your job is NOT to summarize. Your job is to DETECT OPPORTUNITY: identify emerging trends, assess content saturation, and generate strategic content intelligence that helps professionals stand out.

For every article you analyze, produce a structured intelligence report with:

1. TREND SCORE (1-10): Momentum — how fast is this topic gaining traction right now?

2. SATURATION SCORE (1-10): Crowding — how many creators are already posting about this?

3. OPPORTUNITY SCORE (1-10): Signal = trendScore * (1 - saturationScore/10) * 2. High = trending AND unsaturated.

4. WHY IT MATTERS: One crisp sentence explaining the real-world business/career impact. Not a summary — a "so what?" for a professional's audience.

5. SUGGESTED ANGLE: The specific lens a creator should take. E.g., "Contrast hype vs. actual enterprise adoption", "Share a personal implementation story", "Debunk common misconceptions".

6. SUGGESTED HOOK: A scroll-stopping opening line or question for a LinkedIn post. Something that provokes curiosity, challenges assumptions, or triggers recognition.

7. SUGGESTED TONE: The emotional register that will perform best for this topic. Choose from: bold-prediction, personal-story, industry-analysis, contrarian-take, practical-guide, thought-provoking-question.

8. SUGGESTED AUDIENCE: The specific professional persona who will find this most valuable. Be specific (e.g., "CTOs evaluating AI infrastructure", "Mid-career engineers exploring career pivots", "B2B SaaS founders thinking about pricing").

Return ONLY a valid JSON array. No markdown, no explanation, no preamble.`;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class TrendsService {
  private readonly logger = new Logger(TrendsService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private hn: HackerNewsService,
    private googleNews: GoogleNewsService,
    private linkedin: LinkedInService,
  ) {}

  // ─── HackerNews sync ─────────────────────────────────────────────────────────

  async syncHackerNews() {
    this.logger.log('Starting HackerNews sync');
    const stories = await this.hn.fetchTopStories();

    if (stories.length === 0) {
      this.logger.warn('No stories fetched from HN');
      return;
    }

    const categorized = await this.categorizeArticles(
      stories.map((s) => ({ id: s.externalId, title: s.title, source: 'HackerNews', score: s.score })),
    );

    this.logger.log(`Upserting ${categorized.length} qualified HN stories`);
    const expiresAt = new Date(Date.now() + TREND_TTL_HOURS * 60 * 60 * 1000);

    for (const story of stories) {
      const cat = categorized.find((c) => c.id === story.externalId);
      if (!cat) continue;

      await this.prisma.trend.upsert({
        where: { source_externalId: { source: TrendSource.HACKERNEWS, externalId: story.externalId } },
        create: {
          source: TrendSource.HACKERNEWS,
          externalId: story.externalId,
          title: story.title,
          url: story.url,
          summary: cat.summary,
          score: story.score,
          commentCount: story.commentCount,
          publishedAt: story.publishedAt,
          categories: cat.categories,
          professionalRelevance: cat.professionalRelevance,
          intelligence: cat.intelligence as object,
          expiresAt,
        },
        update: {
          score: story.score,
          commentCount: story.commentCount,
          categories: cat.categories,
          summary: cat.summary,
          professionalRelevance: cat.professionalRelevance,
          intelligence: cat.intelligence as object,
          expiresAt,
          fetchedAt: new Date(),
        },
      });
    }

    await this.pruneExpired();
    this.logger.log('HackerNews sync complete');
  }

  // ─── Google News sync ────────────────────────────────────────────────────────

  async syncGoogleNews() {
    this.logger.log('Starting Google News sync');

    const niches = await this.getUniqueUserNiches();
    const queries = niches.length > 0 ? niches.slice(0, MAX_NICHE_QUERIES) : DEFAULT_NICHE_QUERIES;

    this.logger.log(`Fetching Google News for ${queries.length} queries`);

    const articleMap = new Map<string, NewsArticle>();
    for (const niche of queries) {
      const articles = await this.googleNews.fetchForNiche(niche);
      for (const a of articles) {
        if (!articleMap.has(a.url)) articleMap.set(a.url, a);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    const articles = [...articleMap.values()];
    if (articles.length === 0) {
      this.logger.warn('No Google News articles fetched');
      return;
    }

    const categorized = await this.categorizeArticles(
      articles.map((a) => ({ id: a.url, title: a.title, source: 'Google News' })),
    );

    this.logger.log(`Upserting ${categorized.length} qualified Google News articles`);
    const expiresAt = new Date(Date.now() + TREND_TTL_HOURS * 60 * 60 * 1000);

    for (const article of articles) {
      const cat = categorized.find((c) => c.id === article.url);
      if (!cat) continue;

      await this.prisma.trend.upsert({
        where: { source_externalId: { source: TrendSource.GOOGLE_NEWS, externalId: article.url } },
        create: {
          source: TrendSource.GOOGLE_NEWS,
          externalId: article.url,
          title: article.title,
          url: article.url,
          summary: cat.summary,
          score: 50,
          commentCount: 0,
          publishedAt: article.publishedAt,
          categories: cat.categories,
          professionalRelevance: cat.professionalRelevance,
          intelligence: cat.intelligence as object,
          expiresAt,
        },
        update: {
          title: article.title,
          categories: cat.categories,
          summary: cat.summary,
          professionalRelevance: cat.professionalRelevance,
          intelligence: cat.intelligence as object,
          expiresAt,
          fetchedAt: new Date(),
        },
      });
    }

    await this.pruneExpired();
    this.logger.log('Google News sync complete');
  }

  // ─── LinkedIn sync ───────────────────────────────────────────────────────────

  async syncLinkedIn() {
    this.logger.log('Starting LinkedIn sync');

    const niches = await this.getUniqueUserNiches();
    const queries = niches.length > 0 ? niches.slice(0, MAX_NICHE_QUERIES) : this.linkedin.getDefaultHashtags();

    const articleMap = new Map<string, NewsArticle>();
    for (const niche of queries) {
      const articles = await this.linkedin.fetchForNiche(niche);
      for (const a of articles) {
        if (!articleMap.has(a.url)) articleMap.set(a.url, a);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    const articles = [...articleMap.values()];
    if (articles.length === 0) {
      this.logger.warn('No LinkedIn articles fetched');
      return;
    }

    const categorized = await this.categorizeArticles(
      articles.map((a) => ({ id: a.url, title: a.title, source: 'LinkedIn Pulse' })),
    );

    this.logger.log(`Upserting ${categorized.length} qualified LinkedIn articles`);
    const expiresAt = new Date(Date.now() + TREND_TTL_HOURS * 60 * 60 * 1000);

    for (const article of articles) {
      const cat = categorized.find((c) => c.id === article.url);
      if (!cat) continue;

      await this.prisma.trend.upsert({
        where: { source_externalId: { source: TrendSource.LINKEDIN, externalId: article.url } },
        create: {
          source: TrendSource.LINKEDIN,
          externalId: article.url,
          title: article.title,
          url: article.url,
          summary: cat.summary,
          score: 50,
          commentCount: 0,
          publishedAt: article.publishedAt,
          categories: cat.categories,
          professionalRelevance: cat.professionalRelevance,
          intelligence: cat.intelligence as object,
          expiresAt,
        },
        update: {
          title: article.title,
          categories: cat.categories,
          summary: cat.summary,
          professionalRelevance: cat.professionalRelevance,
          intelligence: cat.intelligence as object,
          expiresAt,
          fetchedAt: new Date(),
        },
      });
    }

    await this.pruneExpired();
    this.logger.log('LinkedIn sync complete');
  }

  // ─── Trend queries ───────────────────────────────────────────────────────────

  async getTrendsForUser(userId: string, cursor?: string, limit = 20) {
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
      select: { niches: true },
    });

    const userNiches = prefs?.niches ?? [];

    const trends = await this.prisma.trend.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { score: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });

    const savedTrends = await this.prisma.savedTrend.findMany({
      where: { userId, trendId: { in: trends.map((t) => t.id) } },
      select: { trendId: true },
    });
    const savedIds = new Set(savedTrends.map((s) => s.trendId));

    // hasNext is determined from the raw limit+1 fetch BEFORE any in-memory filtering,
    // so the cursor correctly reflects whether more DB records exist.
    const hasNext = trends.length > limit;
    const rawPage = trends.slice(0, limit);

    const allScored = rawPage.map((trend) => ({
      ...trend,
      relevanceScore: this.computeRelevanceScore(trend.categories, trend.score, userNiches),
      isSaved: savedIds.has(trend.id),
    }));

    // Filter to user-relevant trends; fall back to all if nothing qualifies
    const filtered = userNiches.length > 0
      ? allScored.filter((t) => t.relevanceScore >= 0.3)
      : allScored;
    const page = (filtered.length > 0 ? filtered : allScored)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      trends: page,
      nextCursor: hasNext ? rawPage[rawPage.length - 1]?.id : undefined,
      total: page.length,
    };
  }

  async saveTrend(userId: string, trendId: string) {
    return this.prisma.savedTrend.upsert({
      where: { userId_trendId: { userId, trendId } },
      create: { userId, trendId },
      update: {},
    });
  }

  async unsaveTrend(userId: string, trendId: string) {
    await this.prisma.savedTrend.deleteMany({ where: { userId, trendId } });
  }

  async getSavedTrends(userId: string) {
    return this.prisma.savedTrend.findMany({
      where: { userId },
      include: { trend: true },
      orderBy: { savedAt: 'desc' },
    });
  }

  // ─── Two-phase categorization ─────────────────────────────────────────────────

  private async categorizeArticles(items: ArticleItem[]): Promise<CategorizationResult[]> {
    // ── Phase A: keyword categories + heuristic relevance (free, no AI) ──────
    const phaseAMap = new Map<string, { categories: string[]; professionalRelevance: number }>();
    for (const item of items) {
      const categories = this.assignCategories(item.title);
      const professionalRelevance = this.heuristicRelevance(categories, item.score ?? 50, item.source);
      phaseAMap.set(item.id, { categories, professionalRelevance });
    }

    const qualified = items.filter((item) => {
      const a = phaseAMap.get(item.id)!;
      return a.professionalRelevance >= MIN_PROFESSIONAL_RELEVANCE;
    });

    this.logger.log(
      `Keyword-categorized ${items.length} articles, ${qualified.length} qualified for AI enrichment`,
    );

    if (qualified.length === 0) return [];

    // ── Phase B: AI enrichment for qualified articles only (summary + intelligence) ──
    const toEnrich = qualified.slice(0, MAX_ARTICLES_PER_SYNC);

    // Skip articles already enriched within the last 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await this.prisma.trend.findMany({
      where: { externalId: { in: toEnrich.map((i) => i.id) }, fetchedAt: { gt: cutoff } },
      select: { externalId: true, summary: true, intelligence: true },
    });

    const cachedMap = new Map<string, AiEnrichmentResult>();
    for (const t of existing) {
      if (t.intelligence != null) {
        cachedMap.set(t.externalId, {
          id: t.externalId,
          summary: t.summary ?? '',
          intelligence: t.intelligence as unknown as TrendIntelligence,
        });
      }
    }

    const needsEnrichment = toEnrich.filter((i) => !cachedMap.has(i.id));
    this.logger.log(
      `${cachedMap.size} already enriched (skipping AI), ${needsEnrichment.length} new articles sent to AI`,
    );

    const freshlyEnriched = needsEnrichment.length > 0
      ? await this.enrichWithAi(needsEnrichment)
      : new Map<string, AiEnrichmentResult>();

    // Merge cached + freshly enriched
    const enriched = new Map<string, AiEnrichmentResult>([...cachedMap, ...freshlyEnriched]);

    const fallbackIntel: TrendIntelligence = {
      trendScore: 5, saturationScore: 5, opportunityScore: 5,
      whyItMatters: 'Relevant professional topic',
      suggestedAngle: 'Share your perspective',
      suggestedHook: 'Here is something worth noting',
      suggestedTone: 'industry-analysis',
      suggestedAudience: 'LinkedIn professionals',
    };

    // ── Merge Phase A + Phase B ───────────────────────────────────────────────
    return toEnrich.map((item) => {
      const phaseA = phaseAMap.get(item.id)!;
      const ai = enriched.get(item.id);
      return {
        id: item.id,
        categories: phaseA.categories,
        professionalRelevance: phaseA.professionalRelevance,
        summary: ai?.summary ?? '',
        intelligence: ai?.intelligence ?? fallbackIntel,
      };
    });
  }

  private async enrichWithAi(items: ArticleItem[]): Promise<Map<string, AiEnrichmentResult>> {
    const resultMap = new Map<string, AiEnrichmentResult>();

    for (const chunk of this.chunkArray(items, BATCH_SIZE)) {
      const source = chunk[0]?.source ?? 'news';
      const userPrompt = `Analyze these ${source} articles. For each return a JSON object with:
- id: exact article id as given
- summary: ≤15-word study note useful for a LinkedIn post
- intelligence: { trendScore, saturationScore, opportunityScore (all 1-10 integers), whyItMatters (≤10 words), suggestedAngle (≤8 words), suggestedHook (≤12 words), suggestedTone (one of: bold-prediction|personal-story|industry-analysis|contrarian-take|practical-guide|thought-provoking-question), suggestedAudience (≤8 words) }

Articles: ${JSON.stringify(chunk.map((a) => ({ id: a.id, title: a.title })))}

Return JSON array only.`;

      const batch = await this.runAiEnrichment(userPrompt);
      for (const r of batch) resultMap.set(r.id, r);

      if (resultMap.size < items.length) {
        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
      }
    }

    return resultMap;
  }

  private async runAiEnrichment(userPrompt: string): Promise<AiEnrichmentResult[]> {
    try {
      const response = await this.ai.chat(
        INTELLIGENCE_SYSTEM_PROMPT, userPrompt, 'categorization', undefined, 'categorization', 1800,
      );
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();

      let parsed: AiEnrichmentResult[];
      try {
        parsed = JSON.parse(cleaned) as AiEnrichmentResult[];
      } catch {
        parsed = this.extractPartialItems(cleaned);
        if (parsed.length > 0) {
          this.logger.warn(`Recovered ${parsed.length} items from truncated AI response`);
        } else {
          this.logger.error('AI enrichment failed: response truncated, no items recoverable');
          return [];
        }
      }

      return parsed;
    } catch (error) {
      this.logger.error('AI enrichment failed', error);
      return [];
    }
  }

  // ─── Keyword categorizer (Phase A) ───────────────────────────────────────────

  private assignCategories(title: string): string[] {
    const lower = title.toLowerCase();
    const matched: string[] = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        matched.push(category);
      }
    }

    // Return up to 4 matched categories, fall back to Engineering for dev-adjacent topics
    return matched.slice(0, 4).length > 0 ? matched.slice(0, 4) : ['Engineering'];
  }

  private heuristicRelevance(categories: string[], score: number, source: string): number {
    // HN base: higher upvotes → higher relevance (250 pts = 4, 750 = 6, 1250 = 8)
    const base = source === 'HackerNews'
      ? Math.min(3 + Math.floor(score / 250), 7)
      : 5;

    const hasProfessionalCat = categories.some((c) => PROFESSIONAL_CATEGORIES.has(c));
    const rel = base + (hasProfessionalCat ? 1.5 : 0);
    return Math.min(Math.round(rel), 10);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private computeRelevanceScore(categories: string[], score: number, niches: string[]): number {
    let relevance = Math.min(score * 0.01, 10);

    for (const category of categories) {
      for (const niche of niches) {
        const affinities = NICHE_AFFINITIES[niche] ?? {};
        relevance += (affinities[category] ?? 0) * 10;
      }
    }

    return Math.min(relevance, 100);
  }

  private async getUniqueUserNiches(): Promise<string[]> {
    const prefs = await this.prisma.userPreferences.findMany({ select: { niches: true } });
    const all = prefs.flatMap((p) => p.niches);
    return [...new Set(all)].filter(Boolean);
  }

  private extractPartialItems(raw: string): AiEnrichmentResult[] {
    const items: AiEnrichmentResult[] = [];
    let depth = 0;
    let start = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (raw[i] === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          try {
            const obj = JSON.parse(raw.slice(start, i + 1)) as AiEnrichmentResult;
            if (obj.id && obj.summary) items.push(obj);
          } catch { /* malformed — skip */ }
          start = -1;
        }
      }
    }
    return items;
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }

  private async pruneExpired() {
    const { count } = await this.prisma.trend.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) this.logger.log(`Pruned ${count} expired trends`);
  }
}
