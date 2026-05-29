import { Injectable, Logger } from '@nestjs/common';
import { NewsArticle } from './google-news.service';

/** Maps user niches to LinkedIn hashtag slugs (lowercase, no spaces) */
const NICHE_TO_HASHTAGS: Record<string, string[]> = {
  'AI/ML Engineer':    ['artificialintelligence', 'machinelearning', 'deeplearning', 'llm'],
  'Product Manager':   ['productmanagement', 'productdevelopment', 'productdesign', 'agile'],
  'Software Engineer': ['softwareengineering', 'programming', 'webdevelopment', 'devops'],
  'Founder':           ['entrepreneurship', 'startups', 'founder', 'venturecapital'],
  'Marketer':          ['marketing', 'digitalmarketing', 'contentmarketing', 'growthhacking'],
  'Designer':          ['uxdesign', 'productdesign', 'ui', 'designthinking'],
  'Data Scientist':    ['datascience', 'dataanalytics', 'machinelearning', 'python'],
  'Consultant':        ['consulting', 'strategy', 'leadership', 'managementconsulting'],
  'Recruiter':         ['recruiting', 'hiring', 'talentacquisition', 'hr'],
  'Educator':          ['education', 'elearning', 'learning', 'careerdevelopment'],
};

const DEFAULT_HASHTAGS = [
  'leadership',
  'artificialintelligence',
  'entrepreneurship',
  'productmanagement',
  'careerdevelopment',
  'technology',
];

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);

  /**
   * Fetch LinkedIn Pulse articles for a user niche.
   * Tries LinkedIn's hashtag RSS feed first; falls back to a Google News
   * site:linkedin.com/pulse query if that fails.
   */
  async fetchForNiche(niche: string, limit = 8): Promise<NewsArticle[]> {
    const hashtags = (NICHE_TO_HASHTAGS[niche] ?? [niche.toLowerCase().replace(/\s+/g, '')]).slice(0, 2);

    const articles: NewsArticle[] = [];
    for (const tag of hashtags) {
      const fromLinkedIn = await this.fetchHashtagRss(tag, limit);
      for (const a of fromLinkedIn) {
        if (!articles.find((x) => x.url === a.url)) articles.push(a);
      }
      if (articles.length >= limit) break;

      // Fallback: Google News filtered to linkedin.com/pulse
      if (articles.length < 3) {
        const fromGoogle = await this.fetchGooglePulseFallback(tag, limit);
        for (const a of fromGoogle) {
          if (!articles.find((x) => x.url === a.url)) articles.push(a);
        }
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    return articles.slice(0, limit);
  }

  getDefaultHashtags(): string[] {
    return DEFAULT_HASHTAGS;
  }

  private async fetchHashtagRss(hashtag: string, limit: number): Promise<NewsArticle[]> {
    const url = `https://www.linkedin.com/rss/tag/${hashtag}`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SynapseBot/1.0)' },
      });
      if (!res.ok) {
        this.logger.debug(`LinkedIn RSS ${res.status} for #${hashtag}`);
        return [];
      }
      const xml = await res.text();
      if (!xml.includes('<item>')) return [];
      return this.parseRss(xml, limit, hashtag);
    } catch (err) {
      this.logger.debug(`LinkedIn RSS failed for #${hashtag}: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  private async fetchGooglePulseFallback(hashtag: string, limit: number): Promise<NewsArticle[]> {
    const query = `site:linkedin.com/pulse ${hashtag.replace(/([a-z])([A-Z])/g, '$1 $2')}`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) return [];
      const xml = await res.text();
      return this.parseRss(xml, limit, hashtag);
    } catch {
      return [];
    }
  }

  private parseRss(xml: string, limit: number, hashtag: string): NewsArticle[] {
    const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    const results: NewsArticle[] = [];

    for (const block of itemBlocks) {
      if (results.length >= limit) break;

      const title = this.extractTag(block, 'title');
      const link = this.extractTag(block, 'link') || this.extractTag(block, 'guid');
      const pubDate = this.extractTag(block, 'pubDate');

      if (!title || !link) continue;

      results.push({
        title: this.cleanTitle(title),
        url: link,
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
      });
    }

    if (results.length === 0) {
      this.logger.debug(`LinkedIn RSS #${hashtag}: 0 items parsed from ${itemBlocks.length} blocks`);
    }

    return results;
  }

  private extractTag(xml: string, tag: string): string {
    const re = new RegExp(
      `<${tag}(?:\\s[^>]*)?>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*?))?\\s*<\\/${tag}>`,
      'i',
    );
    const m = xml.match(re);
    return ((m?.[1] ?? m?.[2]) || '').trim();
  }

  private cleanTitle(title: string): string {
    return title.replace(/\s+-\s+[^-]+$/, '').trim() || title.trim();
  }
}