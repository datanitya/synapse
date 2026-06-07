import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BrandMemoryService } from './brand-memory.service';
import { PostAnalyticsService } from './post-analytics.service';

interface AuthUser { id: string }

@Controller('brand-memory')
@UseGuards(JwtAuthGuard)
export class BrandMemoryController {
  constructor(
    private brandMemoryService: BrandMemoryService,
    private postAnalytics: PostAnalyticsService,
  ) {}

  @Get('dna')
  getDna(@CurrentUser() user: AuthUser) {
    return this.brandMemoryService.getDna(user.id);
  }

  @Post('analyze')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  analyze(@CurrentUser() user: AuthUser) {
    return this.brandMemoryService.analyzeDna(user.id);
  }

  @Get('score')
  getBrandScore(@CurrentUser() user: AuthUser) {
    return this.brandMemoryService.getBrandScore(user.id);
  }

  @Get('voice-report')
  getVoiceReport(@CurrentUser() user: AuthUser) {
    return this.brandMemoryService.getVoiceReport(user.id);
  }

  @Post('voice-report')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  generateVoiceReport(@CurrentUser() user: AuthUser) {
    return this.brandMemoryService.generateVoiceReport(user.id);
  }

  @Get('post-analytics')
  getPostAnalytics(@CurrentUser() user: AuthUser) {
    return this.postAnalytics.getForUser(user.id);
  }
}
