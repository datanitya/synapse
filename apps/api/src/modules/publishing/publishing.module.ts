import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PublishingService } from './publishing.service';
import { PublishingProcessor } from './publishing.processor';
import { DraftsModule } from '../drafts/drafts.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.get<string>('redis.url') ?? 'redis://localhost:6379',
      }),
    }),
    BullModule.registerQueue({ name: 'publish' }),
    forwardRef(() => DraftsModule),
  ],
  providers: [PublishingService, PublishingProcessor],
  exports: [PublishingService],
})
export class PublishingModule {}
