import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: PostHog | null = null;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('posthog.apiKey');
    const host = config.get<string>('posthog.host') ?? 'https://app.posthog.com';

    if (apiKey) {
      this.client = new PostHog(apiKey, { host, flushAt: 20, flushInterval: 10_000 });
      this.logger.log('PostHog analytics enabled');
    } else {
      this.logger.warn('POSTHOG_API_KEY not set — analytics disabled');
    }
  }

  async onModuleDestroy() {
    await this.client?.shutdown();
  }

  capture(userId: string, event: string, properties?: Record<string, unknown>) {
    if (!this.client) return;
    try {
      this.client.capture({ distinctId: userId, event, properties });
    } catch (err) {
      this.logger.warn(`Analytics capture failed: ${String(err)}`);
    }
  }
}
