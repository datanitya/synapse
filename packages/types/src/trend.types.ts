export type TrendSource = 'HACKERNEWS' | 'GOOGLE_NEWS' | 'LINKEDIN';

export interface TrendIntelligence {
  trendScore: number;
  saturationScore: number;
  opportunityScore: number;
  whyItMatters: string;
  suggestedAngle: string;
  suggestedHook: string;
  suggestedTone: string;
  suggestedAudience: string;
}

export interface Trend {
  id: string;
  source: TrendSource;
  externalId: string;
  title: string;
  url?: string;
  summary?: string;
  score: number;
  commentCount: number;
  publishedAt: string;
  categories: string[];
  professionalRelevance: number;
  intelligence?: TrendIntelligence;
  fetchedAt: string;
  expiresAt: string;
  relevanceScore?: number;
  isSaved?: boolean;
}

export interface TrendListResponse {
  trends: Trend[];
  nextCursor?: string;
  total: number;
}
