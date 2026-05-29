import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsageService } from './usage.service';

interface AuthUser { id: string }

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private usageService: UsageService) {}

  @Get('stats')
  getStats(@CurrentUser() user: AuthUser) {
    return this.usageService.getStats(user.id);
  }
}
