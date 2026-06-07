import { Module } from '@nestjs/common';
import { DeveloperService } from './developer.service';
import { DeveloperController } from './developer.controller';
import { ApiKeyStrategy } from '../auth/strategies/api-key.strategy';
import { BusinessGuard } from '../../common/guards/business.guard';

@Module({
  controllers: [DeveloperController],
  providers: [DeveloperService, ApiKeyStrategy, BusinessGuard],
  exports: [ApiKeyStrategy, BusinessGuard],
})
export class DeveloperModule {}
