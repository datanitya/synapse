import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get<string>('cloudinary.cloudName'),
      api_key: config.get<string>('cloudinary.apiKey'),
      api_secret: config.get<string>('cloudinary.apiSecret'),
    });
  }

  async uploadBuffer(buffer: Buffer, userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'synapse/uploads',
          public_id: `${userId}_${Date.now()}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  }

  async uploadFromUrl(url: string, userId: string): Promise<string> {
    const buffer = await this.fetchBuffer(url);
    return this.uploadBuffer(buffer, userId);
  }

  private fetchBuffer(url: string): Promise<Buffer> {
    // Prevent SSRF — only allow HTTPS to public hosts
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Invalid URL');
    }
    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('Only HTTPS URLs are allowed');
    }
    const privateRanges = [
      // IPv4 private / link-local
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      // IPv6 loopback, link-local, ULA, and IPv4-mapped equivalents
      /^\[?::1\]?$/,
      /^\[?fe80:/i,
      /^\[?f[cd][0-9a-f]{2}:/i,        // ULA fc00::/7
      /^\[?::ffff:127\./i,
      /^\[?::ffff:10\./i,
      /^\[?::ffff:192\.168\./i,
      /^\[?::ffff:172\.(1[6-9]|2\d|3[01])\./i,
      /^\[?::ffff:169\.254\./i,
    ];
    if (privateRanges.some((r) => r.test(parsed.hostname))) {
      throw new BadRequestException('Private IP addresses are not allowed');
    }
    // Note: DNS rebinding (public hostname → private IP at resolution time) requires
    // post-resolution IP validation, which is not implemented here. Mitigated by
    // the fact that images are only fetched from trusted generation sources (OpenAI CDN).

    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        })
        .on('error', reject);
    });
  }
}
