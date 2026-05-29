import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DraftStatus, ContentType, ContentSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DraftsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, status?: DraftStatus) {
    return this.prisma.draft.findMany({
      where: {
        userId,
        source: ContentSource.AI,
        status: status ?? { not: DraftStatus.ARCHIVED },
      },
      include: { variations: { orderBy: { index: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(
    userId: string,
    data: {
      contentType: ContentType;
      source: ContentSource;
      title?: string;
      finalContent?: string;
      imageUrl?: string;
      suggestedPostAt?: string;
    },
  ) {
    return this.prisma.draft.create({
      data: {
        userId,
        promptVersion: 'manual',
        contentType: data.contentType,
        source: data.source,
        title: data.title,
        finalContent: data.finalContent,
        imageUrl: data.imageUrl,
        suggestedPostAt: data.suggestedPostAt ? new Date(data.suggestedPostAt) : undefined,
        status: DraftStatus.DRAFT,
      },
      include: { variations: { orderBy: { index: 'asc' } } },
    });
  }

  async findOne(userId: string, id: string) {
    const draft = await this.prisma.draft.findUnique({
      where: { id },
      include: { variations: { orderBy: { index: 'asc' } } },
    });

    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.userId !== userId) throw new ForbiddenException();
    return draft;
  }

  async update(
    userId: string,
    id: string,
    data: {
      finalContent?: string;
      status?: DraftStatus;
      userNotes?: string;
      suggestedPostAt?: string | null;
      postedAt?: string | null;
      imageUrl?: string | null;
      title?: string;
    },
  ) {
    await this.findOne(userId, id);
    return this.prisma.draft.update({
      where: { id },
      data: {
        ...data,
        suggestedPostAt: data.suggestedPostAt === null ? null : data.suggestedPostAt ? new Date(data.suggestedPostAt) : undefined,
        postedAt: data.postedAt === null ? null : data.postedAt ? new Date(data.postedAt) : undefined,
      },
      include: { variations: { orderBy: { index: 'asc' } } },
    });
  }

  async selectVariation(userId: string, draftId: string, variationId: string) {
    const draft = await this.findOne(userId, draftId);
    const variation = draft.variations.find((v) => v.id === variationId);
    if (!variation) throw new NotFoundException('Variation not found');

    await this.prisma.$transaction([
      this.prisma.draftVariation.updateMany({
        where: { draftId },
        data: { selected: false },
      }),
      this.prisma.draftVariation.update({
        where: { id: variationId },
        data: { selected: true },
      }),
      this.prisma.draft.update({
        where: { id: draftId },
        data: { finalContent: variation.content },
      }),
    ]);

    return this.findOne(userId, draftId);
  }

  async archive(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.draft.update({
      where: { id },
      data: { status: DraftStatus.ARCHIVED },
    });
  }
}
