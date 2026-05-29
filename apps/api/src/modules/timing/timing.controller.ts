import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthUser { id: string }
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TimingService } from './timing.service';

@Controller('timing')
@UseGuards(JwtAuthGuard)
export class TimingController {
  constructor(private timingService: TimingService) {}

  @Get('recommendation')
  getRecommendation(@CurrentUser() user: AuthUser) {
    return this.timingService.getRecommendations(user.id);
  }
}
