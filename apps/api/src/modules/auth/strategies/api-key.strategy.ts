import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async validate(req: Request) {
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer sk_')) {
      throw new UnauthorizedException('Missing or invalid API key');
    }

    const rawKey = auth.slice('Bearer '.length).trim();
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (!apiKey || !apiKey.isActive) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Update lastUsedAt without blocking the request
    this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => null);

    return apiKey.user;
  }
}
