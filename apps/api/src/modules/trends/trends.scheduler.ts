import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TrendsService } from './trends.service';

@Injectable()
export class TrendsScheduler implements OnModuleInit {
  private readonly logger = new Logger(TrendsScheduler.name);

  constructor(private trendsService: TrendsService) {}

  onModuleInit() {
    // Only HN runs at startup — Google News & LinkedIn run on their cron schedules
    // to avoid hammering the AI rate limit with three concurrent syncs on boot.
    setTimeout(() => {
      this.logger.log('Running startup HackerNews sync');
      this.trendsService.syncHackerNews().catch((err) =>
        this.logger.warn(`Startup HN sync failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 5_000);
  }

  @Cron('0 */6 * * *')
  handleHackerNewsCron() {
    this.logger.log('Running scheduled HackerNews sync');
    this.trendsService.syncHackerNews().catch((err) =>
      this.logger.warn(`Scheduled HN sync failed: ${err instanceof Error ? err.message : err}`),
    );
  }

  @Cron('30 */6 * * *')
  handleGoogleNewsCron() {
    this.logger.log('Running scheduled Google News sync');
    this.trendsService.syncGoogleNews().catch((err) =>
      this.logger.warn(`Scheduled Google News sync failed: ${err instanceof Error ? err.message : err}`),
    );
  }

  @Cron('0 */8 * * *')
  handleLinkedInCron() {
    this.logger.log('Running scheduled LinkedIn sync');
    this.trendsService.syncLinkedIn().catch((err) =>
      this.logger.warn(`Scheduled LinkedIn sync failed: ${err instanceof Error ? err.message : err}`),
    );
  }
}