import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BrandMemoryService } from './brand-memory.service';

interface AuthUser { id: string }

@Controller('brand-memory')
@UseGuards(JwtAuthGuard)
export class BrandMemoryController {
  constructor(private brandMemoryService: BrandMemoryService) {}

  @Get('dna')
  getDna(@CurrentUser() user: AuthUser) {
    return this.brandMemoryService.getDna(user.id);
  }

  @Post('analyze')
  analyze(@CurrentUser() user: AuthUser) {
    return this.brandMemoryService.analyzeDna(user.id);
  }
}
