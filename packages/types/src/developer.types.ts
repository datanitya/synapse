export interface ApiKey {
  id: string;
  name: string;
  prefix: string;            // first 16 chars shown in UI (e.g. "sk_live_abc1ef23")
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse {
  key: string;               // full key — shown ONCE, not stored
  prefix: string;
  name: string;
  expiresAt: string | null;
}

export interface CreateApiKeyPayload {
  name: string;
  expiresInDays?: number;
}

export interface NicheLeaderboardEntry {
  rank: number;
  name: string;
  profilePictureUrl: string | null;
  score: number;
  level: string;
  hookStyle: string | null;
  samplesAnalyzed: number;
}

export interface NicheLeaderboard {
  niche: string;
  total: number;
  entries: NicheLeaderboardEntry[];
}

export interface NicheStats {
  niche: string;
  totalCreators: number;
  activeCreators: number;
  postsThisMonth: number;
}

export interface NicheOption {
  niche: string;
  creatorCount: number;
}
