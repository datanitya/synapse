import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { DailyDigestService } from './daily-digest.service';
import { DailyDigestController } from './daily-digest.controller';
import { ContentModule } from '../content/content.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ContentModule, NotificationsModule],
  controllers: [DailyDigestController],
  providers: [DailyDigestService, EmailService],
  exports: [EmailService],
})
export class DigestModule {}
