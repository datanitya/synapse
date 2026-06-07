import { Controller, Get, Post, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

interface AuthUser { id: string; email: string }

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(
    private onboardingService: OnboardingService,
    private authService: AuthService,
  ) {}

  @Get('status')
  getStatus(@CurrentUser() user: AuthUser) {
    return this.onboardingService.getStatus(user.id);
  }

  @Post('complete')
  async complete(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteOnboardingDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const updatedUser = await this.onboardingService.complete(user.id, dto);
    const token = this.authService.signJwt({
      id: updatedUser.id,
      email: updatedUser.email,
      onboardingComplete: true,
      role: (updatedUser as unknown as { role?: string }).role ?? 'USER',
    });
    res.cookie('synapse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return updatedUser;
  }
}
