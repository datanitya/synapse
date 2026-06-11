import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DraftStatus, ContentType, ContentSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AnalyticsService } from '../../common/analytics/analytics.service';

@Injectable()
export class DraftsService {
  private readonly logger = new Logger(DraftsService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private analytics: AnalyticsService,
  ) {}

  async findAll(userId: string, status?: DraftStatus, limit?: number) {
    return this.prisma.draft.findMany({
      where: {
        userId,
        source: ContentSource.AI,
        status: status ?? { not: DraftStatus.ARCHIVED },
      },
      include: { variations: { orderBy: { index: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
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
    const existing = await this.findOne(userId, id);

    // Track edits for Brand Memory — only when user changes finalContent on an AI draft
    if (
      data.finalContent &&
      data.finalContent !== existing.finalContent &&
      existing.source === ContentSource.AI
    ) {
      const selectedVariation = existing.variations.find((v) => v.selected);
      const original = selectedVariation?.content ?? existing.finalContent ?? '';
      if (original && original !== data.finalContent) {
        await this.prisma.contentEdit.create({
          data: { userId, draftId: id, original, edited: data.finalContent },
        });
      }
    }

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

  async publish(userId: string, draftId: string) {
    const draft = await this.findOne(userId, draftId);

    if (draft.status === DraftStatus.PUBLISHED) {
      throw new ConflictException('This draft has already been published.');
    }
    if (!draft.finalContent?.trim()) {
      throw new BadRequestException('Select a variation or add content before publishing.');
    }

    // Load user — need encrypted accessToken and linkedinId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { linkedinId: true, accessToken: true, tokenExpiresAt: true },
    });

    if (!user?.accessToken) {
      throw new UnauthorizedException('LinkedIn account not connected. Please log in again.');
    }
    if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
      throw new UnauthorizedException('LinkedIn token expired. Please log out and reconnect your LinkedIn account.');
    }

    const accessToken = this.crypto.decrypt(user.accessToken);
    const postUrn = await this.callLinkedInUgcApi(accessToken, user.linkedinId, draft.finalContent);

    const published = await this.prisma.draft.update({
      where: { id: draftId },
      data: {
        status: DraftStatus.PUBLISHED,
        postedAt: new Date(),
        linkedinPostId: postUrn,
      },
      include: { variations: { orderBy: { index: 'asc' } } },
    });

    this.analytics.capture(userId, 'draft_published', {
      draftId,
      contentType: published.contentType,
      linkedinPostId: postUrn || null,
    });

    return published;
  }

  private async callLinkedInUgcApi(
    accessToken: string,
    linkedinId: string,
    content: string,
  ): Promise<string> {
    const body = {
      author: `urn:li:person:${linkedinId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(`LinkedIn API error ${response.status}: ${errorText}`);

      if (response.status === 401) {
        throw new UnauthorizedException('LinkedIn rejected the request. Please reconnect your account.');
      }
      if (response.status === 403) {
        throw new ForbiddenException('LinkedIn app lacks posting permission. Ensure w_member_social scope is granted.');
      }
      if (response.status === 422) {
        throw new BadRequestException('LinkedIn rejected the post content. Please revise and try again.');
      }
      throw new InternalServerErrorException('LinkedIn publishing failed. Please try again shortly.');
    }

    // LinkedIn returns the post URN in the X-RestLi-Id header
    const postUrn = response.headers.get('x-restli-id') ?? response.headers.get('X-RestLi-Id') ?? '';
    if (!postUrn) {
      // Fallback: parse from response body if header absent
      try {
        const data = await response.json() as { id?: string };
        return data.id ?? '';
      } catch {
        return '';
      }
    }
    return postUrn;
  }
}
