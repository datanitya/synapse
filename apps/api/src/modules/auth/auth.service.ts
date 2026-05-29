import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

interface LinkedInUserData {
  linkedinId: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
  headline?: string;
  linkedinProfileUrl?: string;
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    const keyHex = config.get<string>('encryption.key') ?? '0'.repeat(64);
    this.encryptionKey = Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
  }

  async validateLinkedInUser(data: LinkedInUserData) {
    const encryptedAccess = this.encrypt(data.accessToken);
    const encryptedRefresh = data.refreshToken ? this.encrypt(data.refreshToken) : null;

    const user = await this.prisma.user.upsert({
      where: { linkedinId: data.linkedinId },
      create: {
        linkedinId: data.linkedinId,
        email: data.email,
        name: data.name,
        headline: data.headline,
        profilePictureUrl: data.profilePictureUrl,
        linkedinProfileUrl: data.linkedinProfileUrl,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
      },
      update: {
        name: data.name,
        headline: data.headline,
        profilePictureUrl: data.profilePictureUrl,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
      },
    });

    return user;
  }

  signJwt(user: { id: string; email: string; onboardingComplete: boolean }) {
    const payload = {
      sub: user.id,
      email: user.email,
      onboardingComplete: user.onboardingComplete,
    };
    return this.jwtService.sign(payload);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }
}
