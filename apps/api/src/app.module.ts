import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { PlansModule } from './modules/plans/plans.module';
import { AdminModule } from './modules/admin/admin.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { BrandMemoryModule } from './modules/brand-memory/brand-memory.module';
import { BillingModule } from './modules/billing/billing.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { DeveloperModule } from './modules/developer/developer.module';
import { CommunityModule } from './modules/community/community.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { RedisModule } from './common/redis/redis.module';
import { AnalyticsModule } from './common/analytics/analytics.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ScheduleModule.forRoot(),
    CryptoModule,
    RedisModule,
    AnalyticsModule,
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
    PlansModule,
    AdminModule,
    WaitlistModule,
    BrandMemoryModule,
    BillingModule,
    PublishingModule,
    DeveloperModule,
    CommunityModule,
    OrganizationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
