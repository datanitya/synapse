import * as crypto from 'crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../../common/analytics/analytics.service';

// Minimal types for Razorpay webhook payload
interface RzpPaymentEntity {
  id?: string;
  amount?: number;       // paise
  currency?: string;
  status?: string;       // "captured" | "failed"
  method?: string;       // "upi" | "card" | "netbanking" | "wallet"
  email?: string;
  contact?: string;
  description?: string;
}

interface RzpWebhookPayload {
  event: string;
  payload: {
    payment?: { entity?: RzpPaymentEntity };
    subscription?: { entity?: { id?: string; plan_id?: string } };
  };
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly rzp: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private analytics: AnalyticsService,
  ) {
    this.keyId = config.get<string>('razorpay.keyId') ?? '';
    this.keySecret = config.get<string>('razorpay.keySecret') ?? '';
    this.webhookSecret = config.get<string>('razorpay.webhookSecret') ?? '';
    // Razorpay constructor throws if key_id is empty — use placeholder so the server
    // starts without Razorpay keys. Actual calls will fail gracefully via createSubscription check.
    this.rzp = new Razorpay({
      key_id: this.keyId || 'rzp_placeholder',
      key_secret: this.keySecret || 'placeholder',
    });
  }

  async createSubscription(userId: string, planId: string) {
    if (!this.keyId || !this.keySecret) {
      throw new BadRequestException('Payments are not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment.');
    }
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    // FREE plan — cancel any existing subscription and downgrade
    if (plan.tier === 'FREE') {
      await this.cancelSubscription(userId);
      return { free: true };
    }

    const p = plan as unknown as { razorpayPlanId?: string | null };
    if (!p.razorpayPlanId) {
      throw new BadRequestException('This plan is not yet available for purchase. Please contact support.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Cancel any existing subscription before creating a new one
    const u = user as unknown as { razorpaySubscriptionId?: string | null };
    if (u.razorpaySubscriptionId) {
      try {
        await this.rzp.subscriptions.cancel(u.razorpaySubscriptionId, false);
      } catch (err) {
        this.logger.warn(`Could not cancel old subscription ${u.razorpaySubscriptionId}: ${String(err)}`);
      }
    }

    const subscription = await this.rzp.subscriptions.create({
      plan_id: p.razorpayPlanId,
      total_count: 120,   // monthly, up to 10 years
      customer_notify: 0, // we handle UX
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        razorpaySubscriptionId: subscription.id,
        subscriptionStatus: SubscriptionStatus.CREATED,
      } as object,
    });

    return { subscriptionId: subscription.id, keyId: this.keyId };
  }

  async verifyPayment(userId: string, razorpayPaymentId: string, razorpaySubscriptionId: string, razorpaySignature: string) {
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new BadRequestException('Payment signature verification failed');
    }

    await this.activateSubscription(razorpaySubscriptionId);
    return { verified: true };
  }

  async cancelSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const u = user as unknown as { razorpaySubscriptionId?: string | null };
    if (u.razorpaySubscriptionId) {
      try {
        await this.rzp.subscriptions.cancel(u.razorpaySubscriptionId, false);
      } catch (err) {
        this.logger.warn(`Razorpay cancel error: ${String(err)}`);
      }
    }

    const freePlan = await this.prisma.plan.findUnique({ where: { tier: 'FREE' } });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        planId: freePlan?.id ?? null,
        planSince: new Date(),
        razorpaySubscriptionId: null,
        subscriptionStatus: SubscriptionStatus.CANCELLED,
      } as object,
    });

    return { cancelled: true };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    // Verify Razorpay webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.warn('Webhook signature mismatch — ignoring');
      return { received: false };
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as RzpWebhookPayload;
    const { event } = payload;
    const paymentEntity = payload.payload?.payment?.entity;
    const subscriptionEntity = payload.payload?.subscription?.entity;
    const subscriptionId = subscriptionEntity?.id;

    this.logger.log(`Razorpay webhook: ${event} | sub: ${subscriptionId ?? 'n/a'} | pay: ${paymentEntity?.id ?? 'n/a'}`);

    switch (event) {
      case 'subscription.charged':
        if (subscriptionId) await this.activateSubscription(subscriptionId);
        await this.logPayment(event, paymentEntity, subscriptionId, 'captured');
        break;

      case 'subscription.activated':
        if (subscriptionId) await this.activateSubscription(subscriptionId);
        // subscription.activated may not carry a payment entity — log with zero amount
        await this.logPayment(event, paymentEntity ?? {}, subscriptionId, 'captured');
        break;

      case 'subscription.cancelled':
      case 'subscription.completed':
        if (subscriptionId) await this.deactivateSubscription(subscriptionId, SubscriptionStatus.CANCELLED);
        break;

      case 'subscription.pending':
        if (subscriptionId) await this.deactivateSubscription(subscriptionId, SubscriptionStatus.PAST_DUE);
        break;

      case 'payment.failed':
        if (subscriptionId) await this.deactivateSubscription(subscriptionId, SubscriptionStatus.PAST_DUE);
        await this.logPayment(event, paymentEntity, subscriptionId, 'failed');
        break;
    }

    return { received: true };
  }

  private async logPayment(
    event: string,
    paymentEntity: RzpPaymentEntity | undefined,
    razorpaySubscriptionId: string | undefined,
    status: string,
  ) {
    const razorpayPaymentId = paymentEntity?.id;

    // Skip if we've already logged this payment
    if (razorpayPaymentId) {
      const existing = await this.prisma.paymentLog.findUnique({ where: { razorpayPaymentId } });
      if (existing) return;
    }

    // Look up the user by subscription ID to get their name/email
    let userId: string | undefined;
    let userEmail: string | undefined;
    let userName: string | undefined;
    let planDisplayName: string | undefined;

    if (razorpaySubscriptionId) {
      const user = await this.prisma.user.findFirst({
        where: { razorpaySubscriptionId } as object,
        include: { plan: true },
      });
      if (user) {
        userId = user.id;
        userEmail = user.email;
        userName = user.name;
        planDisplayName = user.plan?.displayName ?? undefined;
      }

      // Fallback: look up plan name from Razorpay subscription if user not found
      if (!planDisplayName) {
        try {
          const rzpSub = await this.rzp.subscriptions.fetch(razorpaySubscriptionId) as { plan_id?: string };
          if (rzpSub?.plan_id) {
            const plan = await this.prisma.plan.findFirst({
              where: { razorpayPlanId: rzpSub.plan_id } as object,
            });
            planDisplayName = plan?.displayName ?? undefined;
          }
        } catch { /* best-effort */ }
      }
    }

    // Use email from payment entity if user lookup failed
    if (!userEmail && paymentEntity?.email) userEmail = paymentEntity.email;

    await this.prisma.paymentLog.create({
      data: {
        razorpayPaymentId: razorpayPaymentId ?? null,
        razorpaySubscriptionId: razorpaySubscriptionId ?? null,
        userId: userId ?? null,
        userEmail: userEmail ?? null,
        userName: userName ?? null,
        amountPaise: paymentEntity?.amount ?? 0,
        currency: paymentEntity?.currency ?? 'INR',
        status,
        method: paymentEntity?.method ?? null,
        planDisplayName: planDisplayName ?? null,
        event,
      },
    });
  }

  private async activateSubscription(razorpaySubscriptionId: string) {
    let rzpSub: { plan_id?: string } | null = null;
    try {
      rzpSub = await this.rzp.subscriptions.fetch(razorpaySubscriptionId) as { plan_id?: string };
    } catch (err) {
      this.logger.warn(`Could not fetch Razorpay subscription ${razorpaySubscriptionId}: ${String(err)}`);
    }

    let planId: string | null = null;
    if (rzpSub?.plan_id) {
      const plan = await this.prisma.plan.findFirst({
        where: { razorpayPlanId: rzpSub.plan_id } as object,
      });
      planId = plan?.id ?? null;
    }

    await this.prisma.user.updateMany({
      where: { razorpaySubscriptionId } as object,
      data: { planId, planSince: new Date(), subscriptionStatus: SubscriptionStatus.ACTIVE } as object,
    });

    const user = await this.prisma.user.findFirst({
      where: { razorpaySubscriptionId } as object,
      include: { plan: true },
    });
    if (user) {
      this.analytics.capture(user.id, 'plan_upgraded', {
        planId: user.planId,
        planName: user.plan?.displayName,
        razorpaySubscriptionId,
      });
    }
  }

  private async deactivateSubscription(razorpaySubscriptionId: string, status: SubscriptionStatus) {
    const freePlan = await this.prisma.plan.findUnique({ where: { tier: 'FREE' } });
    await this.prisma.user.updateMany({
      where: { razorpaySubscriptionId } as object,
      data: { planId: freePlan?.id ?? null, subscriptionStatus: status } as object,
    });
  }
}
