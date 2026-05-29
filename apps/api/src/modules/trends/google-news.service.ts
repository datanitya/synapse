import { Injectable, Logger } from '@nestjs/common';

export interface NewsArticle {
  /** Used as externalId — the Google News redirect URL */
  url: string;
  title: string;
  publishedAt: Date;
}

/** Predefined queries used when no user niches are available */
export const DEFAULT_NICHE_QUERIES = [
  'product management leadership',
  'software engineering technology trends',
  'startup entrepreneurship funding',
  'digital marketing strategy',
  'data science artificial intelligence',
  'career growth professional development',
];

/** Maps NICHE_AFFINITIES keys to a more targeted search phrase */
export const NICHE_TO_QUERY: Record<string, string> = {
  'AI/ML Engineer': 'machine learning artificial intelligence engineering',
  'Product Manager': 'product management strategy roadmap',
  'Software Engineer': 'software engineering technology developer',
  'Founder': 'startup founder entrepreneurship growth',
  'Marketer': 'digital marketing growth strategy',
  'Designer': 'UX product design user experience',
  'Data Scientist': 'data science analytics machine learning',
  'Consultant': 'business consulting strategy leadership',
  'Recruiter': 'talent acquisition hiring career',
  'Educator': 'education learning teaching career development',
};

@Injectable()
export class GoogleNewsService {
  private readonly logger = new Logger(GoogleNewsService.name);
  private readonly BASE = 'https://news.google.com/rss/search';

  async fetchForNiche(niche: string, limit = 8): Promise<NewsArticle[]> {
    const query = NICHE_TO_QUERY[niche] ?? `${niche} professional insights trends`;
    return this.fetchForQuery(query, limit);
  }

  async fetchForQuery(query: string, limit = 8): Promise<NewsArticle[]> {
    const url = `${this.BASE}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        this.logger.warn(`Google News HTTP ${res.status} for "${query}"`);
        return [];
      }
      const xml = await res.text();
      return this.parseRss(xml, limit);
    } catch (err) {
      this.logger.warn(`Google News fetch failed for "${query}": ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  private parseRss(xml: string, limit: number): NewsArticle[] {
    const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    const results: NewsArticle[] = [];

    for (const block of itemBlocks) {
      if (results.length >= limit) break;

      const title = this.extractTag(block, 'title');
      const url = this.extractTag(block, 'link') || this.extractTag(block, 'guid');
      const pubDate = this.extractTag(block, 'pubDate');

      if (!title || !url) continue;

      results.push({
        title: this.cleanTitle(title),
        url,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
      });
    }

    return results;
  }

  private extractTag(xml: string, tag: string): string {
    // Handles plain content and CDATA: <tag>text</tag> or <tag><![CDATA[text]]></tag>
    const re = new RegExp(
      `<${tag}(?:\\s[^>]*)?>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*?))?\\s*<\\/${tag}>`,
      'i',
    );
    const m = xml.match(re);
    return ((m?.[1] ?? m?.[2]) || '').trim();
  }

  /** Strips the " - Source Name" suffix Google News appends to titles */
  private cleanTitle(title: string): string {
    return title.replace(/\s+-\s+[^-]+$/, '').trim() || title.trim();
  }
}
