import { Body, Controller, Headers, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

interface AuthUser { id: string }

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

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

  // Webhook — no auth guard, signature is verified inside the service
  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.billingService.handleWebhook(rawBody, signature ?? '');
  }
}
