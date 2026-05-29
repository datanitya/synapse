import { Injectable, Logger } from '@nestjs/common';

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const MIN_SCORE = 50;
const BATCH_SIZE = 20;
const TOP_STORIES_LIMIT = 100;

interface HnItem {
  id: number;
  title?: string;
  url?: string;
  score: number;
  descendants?: number;
  by: string;
  time: number;
  type: string;
  dead?: boolean;
  deleted?: boolean;
}

export interface HnStory {
  externalId: string;
  title: string;
  url?: string;
  score: number;
  commentCount: number;
  publishedAt: Date;
}

@Injectable()
export class HackerNewsService {
  private readonly logger = new Logger(HackerNewsService.name);

  async fetchTopStories(): Promise<HnStory[]> {
    const ids = await this.fetchJson<number[]>(`${HN_API}/topstories.json`);
    const topIds = ids.slice(0, TOP_STORIES_LIMIT);

    const stories: HnStory[] = [];

    for (let i = 0; i < topIds.length; i += BATCH_SIZE) {
      const batch = topIds.slice(i, i + BATCH_SIZE);
      const items = await Promise.allSettled(
        batch.map((id) => this.fetchJson<HnItem>(`${HN_API}/item/${id}.json`)),
      );

      for (const result of items) {
        if (result.status !== 'fulfilled') continue;
        const item = result.value;

        if (
          !item ||
          item.type !== 'story' ||
          item.dead ||
          item.deleted ||
          !item.title ||
          item.score < MIN_SCORE
        ) {
          continue;
        }

        stories.push({
          externalId: String(item.id),
          title: item.title,
          url: item.url,
          score: item.score,
          commentCount: item.descendants ?? 0,
          publishedAt: new Date(item.time * 1000),
        });
      }
    }

    this.logger.log(`Fetched ${stories.length} qualifying HN stories`);
    return stories;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HN API error: ${response.status} ${url}`);
    return response.json() as Promise<T>;
  }
}
