import { Module } from '@nestjs/common';
import { TrendsService } from './trends.service';
import { TrendsController } from './trends.controller';
import { HackerNewsService } from './hackernews.service';
import { GoogleNewsService } from './google-news.service';
import { LinkedInService } from './linkedin.service';
import { TrendsScheduler } from './trends.scheduler';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [TrendsController],
  providers: [TrendsService, HackerNewsService, GoogleNewsService, LinkedInService, TrendsScheduler],
  exports: [TrendsService],
})
export class TrendsModule {}
