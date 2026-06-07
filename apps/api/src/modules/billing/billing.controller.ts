import { Body, Controller, Headers, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

interface AuthUser { id: string }

@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private stripeService: StripeService,
  ) {}

  @Post('create-subscription')
  @UseGuards(JwtAuthGuard)
  createSubscription(@CurrentUser() user: AuthUser, @Body() dto: CreateSubscriptionDto) {
    return this.billingService.createSubscription(user.id, dto.planId);
  }

  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  verifyPayment(@CurrentUser() user: AuthUser, @Body() dto: VerifyPaymentDto) {
    return this.billingService.verifyPayment(
      user.id,
      dto.razorpayPaymentId,
      dto.razorpaySubscriptionId,
      dto.razorpaySignature,
    );
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthUser) {
    return this.billingService.cancelSubscription(user.id);
  }

  // Razorpay webhook — no auth, signature verified inside service
  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.billingService.handleWebhook(rawBody, signature ?? '');
  }

  // ── Stripe ──────────────────────────────────────────────────────────────────

  @Post('stripe/checkout')
  @UseGuards(JwtAuthGuard)
  createStripeCheckout(
    @CurrentUser() user: AuthUser,
    @Body() body: { priceId: string; successUrl: string; cancelUrl: string },
  ) {
    return this.stripeService.createCheckoutSession(
      user.id, body.priceId, body.successUrl, body.cancelUrl,
    );
  }

  @Post('stripe/cancel')
  @UseGuards(JwtAuthGuard)
  cancelStripe(@CurrentUser() user: AuthUser) {
    return this.stripeService.cancelSubscriptionForUser(user.id);
  }

  // Stripe webhook — no auth, signature verified inside service
  @Post('stripe/webhook')
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.stripeService.handleWebhook(rawBody, signature ?? '');
  }
}
