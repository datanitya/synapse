import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DraftStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DraftsService } from './drafts.service';

interface AuthUser { id: string }

@Controller('drafts')
@UseGuards(JwtAuthGuard)
export class DraftsController {
  constructor(private draftsService: DraftsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: DraftStatus,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100) : undefined;
    return this.draftsService.findAll(user.id, status, parsedLimit);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.draftsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body()
    body: {
      finalContent?: string;
      status?: DraftStatus;
      userNotes?: string;
      suggestedPostAt?: string | null;
      postedAt?: string | null;
      imageUrl?: string | null;
      title?: string;
    },
  ) {
    return this.draftsService.update(user.id, id, body);
  }

  @Patch(':id/select-variation/:variationId')
  selectVariation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('variationId') variationId: string,
  ) {
    return this.draftsService.selectVariation(user.id, id, variationId);
  }

  @Delete(':id')
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.draftsService.archive(user.id, id);
  }
}
