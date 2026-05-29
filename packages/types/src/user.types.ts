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

export interface UserProfile {
  id: string;
  linkedinId: string;
  email: string;
  name: string;
  headline?: string;
  profilePictureUrl?: string;
  linkedinProfileUrl?: string;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  niche: string;
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
}

export interface UserWithPreferences extends UserProfile {
  preferences?: UserPreferences;
}

export interface CompleteOnboardingPayload {
  niche: string;
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
