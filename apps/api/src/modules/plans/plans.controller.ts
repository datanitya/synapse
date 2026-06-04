import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlansService } from './plans.service';

interface AuthUser { id: string }

@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Get()
  getPlans() {
    return this.plansService.getActivePlans();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: AuthUser) {
    return this.plansService.getUserPlanStatus(user.id);
  }
}
