import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';

interface Actor { id: string; email: string }

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getUsers(Number(page) || 1, Number(limit) || 20);
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post('users/:id/plan')
  assignPlan(
    @CurrentUser() actor: Actor,
    @Param('id') id: string,
    @Body() dto: AssignPlanDto,
  ) {
    return this.adminService.assignPlan(actor, id, dto.planId);
  }

  @Get('plans')
  getPlans() {
    return this.adminService.getPlans();
  }

  @Patch('plans/:id')
  updatePlan(
    @CurrentUser() actor: Actor,
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.adminService.updatePlan(actor, id, dto);
  }

  @Get('payments')
  getPayments(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getPayments(Number(page) || 1, Number(limit) || 20);
  }

  @Get('audit-logs')
  getAuditLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getAuditLogs(Number(page) || 1, Number(limit) || 50);
  }
}
