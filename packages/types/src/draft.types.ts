export type DraftStatus = 'DRAFT' | 'REFINED' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
export type ContentType = 'POST' | 'BLOG' | 'CAPTION' | 'IMAGE';
export type ContentSource = 'AI' | 'MANUAL';

export interface DraftVariation {
  id: string;
  draftId: string;
  index: number;
  label: string;
  content: string;
  selected: boolean;
}

export interface PostAnalytics {
  id: string;
  draftId: string;
  linkedinPostId: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clickCount: number;
  fetchedAt: string;
  createdAt: string;
}

export interface Draft {
  id: string;
  userId: string;
  trendId?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  promptVersion: string;
  generationParams?: Record<string, unknown>;
  finalContent?: string;
  status: DraftStatus;
  userNotes?: string;
  suggestedPostAt?: string;
  scheduledAt?: string;        // set when queued for auto-publish via Bull
  postedAt?: string;
  linkedinPostId?: string;     // LinkedIn URN after successful publish
  contentType: ContentType;
  source: ContentSource;
  imageUrl?: string;
  title?: string;
  variations: DraftVariation[];
  postAnalytics?: PostAnalytics;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentBankItemPayload {
  contentType: ContentType;
  title?: string;
  content?: string;
  imageUrl?: string;
  suggestedPostAt?: string;
}

export interface GeneratePostPayload {
  topic: string;
  trendId?: string;
  customContext?: string;
}

export interface CreateDraftPayload {
  trendId?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  topic: string;
  customContext?: string;
}

export interface UpdateDraftPayload {
  finalContent?: string;
  status?: DraftStatus;
  userNotes?: string;
  suggestedPostAt?: string | null;
  scheduledAt?: string | null;
  postedAt?: string | null;
  imageUrl?: string | null;
  title?: string;
}
