import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LinkedInTokenRefreshScheduler } from './linkedin-token-refresh.scheduler';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiry') ?? '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LinkedInStrategy, JwtStrategy, LinkedInTokenRefreshScheduler],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
