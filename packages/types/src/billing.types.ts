export type PlanTier = 'FREE' | 'PRO' | 'BUSINESS';

export type SubscriptionStatus =
  | 'CREATED'
  | 'AUTHENTICATED'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'COMPLETED';

export interface Plan {
  id: string;
  tier: PlanTier;
  displayName: string;
  monthlyTokenLimit: number;  // 0 = unlimited
  priceInr: number;
  currency: string;
  features: string[];
  isActive: boolean;
  razorpayPlanId?: string;
  stripePriceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanStatus {
  plan: Plan | null;
  tokensUsed: number;
  monthlyLimit: number;
  isUnlimited: boolean;
  percentUsed: number;
}

export interface PaymentLog {
  id: string;
  razorpayPaymentId?: string;
  razorpaySubscriptionId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  amountPaise: number;
  currency: string;
  status: string;
  method?: string;
  planDisplayName?: string;
  event: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}
