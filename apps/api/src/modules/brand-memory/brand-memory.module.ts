import { Module } from '@nestjs/common';
import { BrandMemoryController } from './brand-memory.controller';
import { BrandMemoryService } from './brand-memory.service';
import { PostAnalyticsService } from './post-analytics.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [BrandMemoryController],
  providers: [BrandMemoryService, PostAnalyticsService],
  exports: [BrandMemoryService, PostAnalyticsService],
})
export class BrandMemoryModule {}
