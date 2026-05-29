import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { TrendsModule } from './modules/trends/trends.module';
import { ContentModule } from './modules/content/content.module';
import { DraftsModule } from './modules/drafts/drafts.module';
import { TimingModule } from './modules/timing/timing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { DigestModule } from './modules/digest/daily-digest.module';
import { UsageModule } from './modules/usage/usage.module';
import { ImagesModule } from './modules/images/images.module';
import { ContentBankModule } from './modules/content-bank/content-bank.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AiModule,
    AuthModule,
    UsersModule,
    OnboardingModule,
    TrendsModule,
    ContentModule,
    DraftsModule,
    TimingModule,
    NotificationsModule,
    DigestModule,
    UsageModule,
    ImagesModule,
    ContentBankModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
