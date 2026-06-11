import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessGuard } from '../../common/guards/business.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeveloperService } from './developer.service';

interface AuthUser { id: string }

@Controller('developer')
@UseGuards(JwtAuthGuard, BusinessGuard)
export class DeveloperController {
  constructor(private developerService: DeveloperService) {}

  @Post('keys')
  createKey(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; expiresInDays?: number },
  ) {
    return this.developerService.createKey(user.id, body.name, body.expiresInDays);
  }

  @Get('keys')
  listKeys(@CurrentUser() user: AuthUser) {
    return this.developerService.listKeys(user.id);
  }

  @Delete('keys/:id')
  revokeKey(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.developerService.revokeKey(user.id, id);
  }
}
