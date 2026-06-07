import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TrendsService } from './trends.service';

interface AuthUser { id: string }

@Controller('trends')
@UseGuards(JwtAuthGuard)
export class TrendsController {
  constructor(private trendsService: TrendsService) {}

  @Get()
  getTrends(
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100) : 20;
    return this.trendsService.getTrendsForUser(user.id, cursor, parsedLimit);
  }

  @Get('saved')
  getSaved(@CurrentUser() user: AuthUser) {
    return this.trendsService.getSavedTrends(user.id);
  }

  @Post(':id/save')
  saveTrend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.trendsService.saveTrend(user.id, id);
  }

  @Delete(':id/save')
  unsaveTrend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.trendsService.unsaveTrend(user.id, id);
  }

  @Post('sync')
  @UseGuards(AdminGuard)
  async triggerSync() {
    await this.trendsService.syncHackerNews();
    return { message: 'Sync triggered' };
  }
}
