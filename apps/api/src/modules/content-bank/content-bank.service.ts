import { Injectable } from '@nestjs/common';
import { ContentSource, ContentType, DraftStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService } from '../drafts/drafts.service';
import { CreateContentBankItemDto } from './dto/create-content-bank-item.dto';
import { UpdateContentBankItemDto } from './dto/update-content-bank-item.dto';

@Injectable()
export class ContentBankService {
  constructor(
    private prisma: PrismaService,
    private draftsService: DraftsService,
  ) {}

  async create(userId: string, dto: CreateContentBankItemDto) {
    return this.draftsService.create(userId, {
      contentType: dto.contentType,
      source: ContentSource.MANUAL,
      title: dto.title,
      finalContent: dto.content,
      imageUrl: dto.imageUrl,
      suggestedPostAt: dto.suggestedPostAt,
    });
  }

  async findAll(userId: string, contentType?: ContentType) {
    return this.prisma.draft.findMany({
      where: {
        userId,
        source: ContentSource.MANUAL,
        status: { not: DraftStatus.ARCHIVED },
        ...(contentType ? { contentType } : {}),
      },
      include: { variations: { orderBy: { index: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    return this.draftsService.findOne(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateContentBankItemDto) {
    return this.draftsService.update(userId, id, {
      finalContent: dto.content,
      status: dto.status,
      title: dto.title,
      imageUrl: dto.imageUrl,
      suggestedPostAt: dto.suggestedPostAt,
      postedAt: dto.postedAt,
    });
  }

  async archive(userId: string, id: string) {
    return this.draftsService.archive(userId, id);
  }
}
