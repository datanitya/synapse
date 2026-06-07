import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

@Injectable()
export class WaitlistService {
  constructor(private prisma: PrismaService) {}

  async join(dto: JoinWaitlistDto) {
    try {
      await this.prisma.waitlistEntry.create({
        data: { email: dto.email, name: dto.name, source: dto.source },
      });
      return { joined: true };
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        return { joined: false, alreadyJoined: true };
      }
      throw e;
    }
  }
}
