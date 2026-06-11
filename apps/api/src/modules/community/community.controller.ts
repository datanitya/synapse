import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  @Get('leaderboard')
  getLeaderboard(
    @Query('niche') niche: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getNicheLeaderboard(
      niche ?? '',
      limit ? Math.min(parseInt(limit, 10) || 10, 25) : 10,
    );
  }

  @Get('niche-stats')
  getNicheStats(@Query('niche') niche: string) {
    return this.communityService.getNicheStats(niche ?? '');
  }

  @Get('niches')
  getAvailableNiches() {
    return this.communityService.getAvailableNiches();
  }
}
