import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

@Injectable()
export class LinkedInTokenRefreshScheduler {
  private readonly logger = new Logger(LinkedInTokenRefreshScheduler.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private config: ConfigService,
  ) {
    this.clientId = config.get<string>('linkedin.clientId') ?? '';
    this.clientSecret = config.get<string>('linkedin.clientSecret') ?? '';
  }

  // Run daily at 3 AM to stay well ahead of expiry
  @Cron('0 3 * * *')
  async refreshExpiringTokens(): Promise<void> {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn('LinkedIn credentials not configured — skipping token refresh');
      return;
    }

    // Find users whose token expires within 7 days and have a refresh token stored
    const expiryThreshold = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.findMany({
      where: {
        refreshToken: { not: null },
        tokenExpiresAt: { lt: expiryThreshold },
      },
      select: { id: true, email: true, refreshToken: true },
    });

    if (users.length === 0) {
      this.logger.log('No tokens expiring within 7 days');
      return;
    }

    this.logger.log(`Refreshing LinkedIn tokens for ${users.length} user(s)`);

    for (const user of users) {
      try {
        await this.refreshUserToken(user.id, user.email, user.refreshToken!);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Token refresh failed for user ${user.id}: ${msg}`);
      }
    }
  }

  private async refreshUserToken(userId: string, email: string, encryptedRefreshToken: string) {
    const refreshToken = this.crypto.decrypt(encryptedRefreshToken);

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`LinkedIn token refresh failed (${response.status}): ${text}`);
    }

    const data = await response.json() as LinkedInTokenResponse;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: this.crypto.encrypt(data.access_token),
        refreshToken: data.refresh_token ? this.crypto.encrypt(data.refresh_token) : undefined,
        tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    this.logger.log(`Token refreshed for ${email} — new expiry in ${Math.round(data.expires_in / 86400)}d`);
  }
}
