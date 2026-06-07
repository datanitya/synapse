import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const keyHex = config.get<string>('encryption.key') ?? '0'.repeat(64);
    this.key = Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(encrypted: string): string {
    const colonIdx = encrypted.indexOf(':');
    if (colonIdx === -1) throw new Error('Stored credential is corrupt or was not encrypted correctly');
    const iv = Buffer.from(encrypted.slice(0, colonIdx), 'hex');
    const data = Buffer.from(encrypted.slice(colonIdx + 1), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
