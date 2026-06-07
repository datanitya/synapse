export type ToneStyle =
  | 'PROFESSIONAL'
  | 'CONVERSATIONAL'
  | 'THOUGHT_LEADER'
  | 'STORYTELLER'
  | 'EDUCATIONAL'
  | 'INSPIRATIONAL';

export type PostingGoal =
  | 'GROW_NETWORK'
  | 'ESTABLISH_EXPERTISE'
  | 'ATTRACT_CLIENTS'
  | 'FIND_JOB'
  | 'BUILD_COMMUNITY'
  | 'SHARE_LEARNINGS';

export type PostingFrequency =
  | 'DAILY'
  | 'THREE_TIMES_WEEK'
  | 'TWICE_WEEK'
  | 'WEEKLY';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type AiProviderType = 'OPENAI' | 'GEMINI' | 'CLAUDE';

export interface UserProfile {
  id: string;
  linkedinId: string;
  email: string;
  name: string;
  headline?: string;
  profilePictureUrl?: string;
  linkedinProfileUrl?: string;
  onboardingComplete: boolean;
  role: 'USER' | 'ADMIN';
  planId?: string;
  createdAt: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  niches: string[];
  goals: PostingGoal[];
  targetAudience?: string;
  toneStyle: ToneStyle;
  writingExamples: string[];
  avoidTopics: string[];
  postingFrequency: PostingFrequency;
  preferredDays: DayOfWeek[];
  timezone: string;
  emailNotifications: boolean;
  reminderEnabled: boolean;
  reminderLeadHours: number;
  // Per-user AI configuration
  aiProvider?: AiProviderType | null;
  aiModel?: string | null;
  hasOpenaiKey?: boolean;
  hasGeminiKey?: boolean;
  hasAnthropicKey?: boolean;
  // LinkedIn company credentials
  linkedinClientId?: string | null;
  hasLinkedinSecret?: boolean;
  linkedinCompanyId?: string | null;
  // Advanced brand voice
  hookStyle?: string | null;
  writingStyle?: string | null;
  sentenceLength?: string | null;
  ctaStyle?: string | null;
  valueProposition?: string | null;
}

export interface UserWithPreferences extends UserProfile {
  preferences?: UserPreferences;
}

export interface BrandDna {
  id: string;
  userId: string;
  hookStyle?: string;
  tone?: string;
  paragraphLength?: 'short' | 'medium' | 'long';
  emojiUsage?: 'none' | 'low' | 'medium' | 'high';
  preferredTopics: string[];
  avgPostLength?: number;
  samplesAnalyzed: number;
  rawDna?: Record<string, unknown>;
  brandScore?: number;
  voiceReport?: string;
  voiceReportUpdatedAt?: string;
  updatedAt: string;
  createdAt: string;
}

export interface BrandScoreResponse {
  score: number;
  samplesAnalyzed: number;
  level: 'New' | 'Emerging' | 'Growing' | 'Established' | 'Expert';
  nextMilestone: string;
}

export interface VoiceReportResponse {
  report: string | null;
  updatedAt: string | null;
}

export interface CompleteOnboardingPayload {
  niches: string[];
  goals: PostingGoal[];
  targetAudience?: string;
  toneStyle: ToneStyle;
  writingExamples?: string[];
  avoidTopics?: string[];
  postingFrequency: PostingFrequency;
  preferredDays: DayOfWeek[];
  timezone: string;
}
