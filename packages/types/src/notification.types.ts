export type NotificationType =
  | 'POSTING_REMINDER'
  | 'NEW_TRENDS_AVAILABLE'
  | 'DRAFT_READY'
  | 'WEEKLY_SUMMARY';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  readAt?: string;
  sentAt?: string;
  emailSent: boolean;
  createdAt: string;
}

export interface TimingSlot {
  datetime: string;
  score: number;
  label: string;
}

export interface TimingRecommendation {
  slots: TimingSlot[];
}
