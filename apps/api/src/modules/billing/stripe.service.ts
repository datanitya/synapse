import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from '../../common/analytics/analytics.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;
  private readonly webhookSecret: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private analytics: AnalyticsService,
  ) {
    const secretKey = config.get<string>('stripe.secretKey');
    this.webhookSecret = config.get<string>('stripe.webhookSecret') ?? '';

    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
      this.logger.log('Stripe initialized');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe payments disabled');
    }
  }

  async createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string) {
    if (!this.stripe) throw new BadRequestException('Stripe is not configured');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const plan = await this.prisma.plan.findFirst({
      where: { stripePriceId: priceId } as object,
    });

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: { userId, planId: plan?.id ?? '' },
      subscription_data: { metadata: { userId } },
    });

    return {
      sessionId: session.id,
      url: session.url,
      publishableKey: this.config.get<string>('stripe.publishableKey'),
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) return { received: false };

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      this.logger.warn('Stripe webhook signature mismatch — ignoring');
      return { received: false };
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.activateFromSession(session);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.syncSubscriptionStatus(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.cancelSubscription(sub.metadata?.userId ?? '', sub.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.markPastDue(invoice.subscription as string);
        break;
      }
    }

    return { received: true };
  }

  async cancelSubscriptionForUser(userId: string) {
    if (!this.stripe) throw new BadRequestException('Stripe is not configured');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true } as object,
    });
    const stripeSubId = (user as any)?.stripeSubscriptionId;
    if (!stripeSubId) throw new BadRequestException('No active Stripe subscription');

    await this.stripe.subscriptions.cancel(stripeSubId);

    const freePlan = await this.prisma.plan.findUnique({ where: { tier: 'FREE' } });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        planId: freePlan?.id ?? null,
        subscriptionStatus: SubscriptionStatus.CANCELLED,
        stripeSubscriptionId: null,
      } as object,
    });

    return { cancelled: true };
  }

  private async activateFromSession(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    if (!userId || !planId) return;

    const stripeSubId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        planId,
        planSince: new Date(),
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: stripeSubId ?? null,
      } as object,
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { plan: true } });
    if (user) {
      this.analytics.capture(userId, 'plan_upgraded', {
        planName: user.plan?.displayName,
        provider: 'stripe',
      });
    }
  }

  private async syncSubscriptionStatus(sub: Stripe.Subscription) {
    const userId = sub.metadata?.userId;
    if (!userId) return;

    const status = sub.status === 'active' ? SubscriptionStatus.ACTIVE
      : sub.status === 'past_due' ? SubscriptionStatus.PAST_DUE
      : sub.status === 'canceled' ? SubscriptionStatus.CANCELLED
      : null;

    if (status) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: status } as object,
      });
    }
  }

  private async cancelSubscription(userId: string, stripeSubId: string) {
    if (!userId) return;
    const freePlan = await this.prisma.plan.findUnique({ where: { tier: 'FREE' } });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        planId: freePlan?.id ?? null,
        subscriptionStatus: SubscriptionStatus.CANCELLED,
        stripeSubscriptionId: null,
      } as object,
    }).catch(() => null);
  }

  private async markPastDue(stripeSubId: string) {
    await this.prisma.user.updateMany({
      where: { stripeSubscriptionId: stripeSubId } as object,
      data: { subscriptionStatus: SubscriptionStatus.PAST_DUE } as object,
    });
  }
}
