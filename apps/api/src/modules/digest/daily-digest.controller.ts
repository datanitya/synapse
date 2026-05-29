import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DailyDigestService } from './daily-digest.service';

interface AuthUser { id: string }

@Controller('digest')
@UseGuards(JwtAuthGuard)
export class DailyDigestController {
  constructor(private digest: DailyDigestService) {}

  // POST /api/digest/trigger — send yourself the digest right now (for testing)
  @Post('trigger')
  trigger(@CurrentUser() user: AuthUser) {
    return this.digest.triggerForUser(user.id);
  }
}
