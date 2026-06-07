import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto/crypto.service';

interface LinkedInSocialCounts {
  numLikes?: number;
  numComments?: number;
  numShares?: number;
  numImpressions?: number;
  numClicks?: number;
}

@Injectable()
export class PostAnalyticsService {
  private readonly logger = new Logger(PostAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  // Weekly fetch of LinkedIn engagement stats for all published posts
  @Cron('0 4 * * 0') // Sunday 4 AM
  async fetchAllStats(): Promise<void> {
    this.logger.log('Fetching LinkedIn post analytics for published drafts');

    const published = await this.prisma.draft.findMany({
      where: {
        status: 'PUBLISHED',
        linkedinPostId: { not: null },
      },
      include: { user: { select: { id: true, accessToken: true, tokenExpiresAt: true } } },
    });

    this.logger.log(`Found ${published.length} published draft(s) with LinkedIn post IDs`);

    for (const draft of published) {
      if (!draft.user.accessToken || !draft.linkedinPostId) continue;
      if (draft.user.tokenExpiresAt && draft.user.tokenExpiresAt < new Date()) {
        this.logger.warn(`Skipping draft ${draft.id} — user token expired`);
        continue;
      }
      try {
        await this.fetchAndStoreSinglePost(draft.id, draft.linkedinPostId, draft.user.accessToken);
      } catch (err) {
        this.logger.warn(`Stats fetch failed for draft ${draft.id}: ${String(err)}`);
      }
    }
  }

  async fetchAndStoreSinglePost(draftId: string, linkedinPostId: string, encryptedToken: string) {
    const accessToken = this.crypto.decrypt(encryptedToken);
    const counts = await this.fetchLinkedInStats(linkedinPostId, accessToken);

    await this.prisma.postAnalytics.upsert({
      where: { draftId },
      create: {
        draftId,
        linkedinPostId,
        impressions: counts.numImpressions ?? 0,
        likes: counts.numLikes ?? 0,
        comments: counts.numComments ?? 0,
        shares: counts.numShares ?? 0,
        clickCount: counts.numClicks ?? 0,
      },
      update: {
        impressions: counts.numImpressions ?? 0,
        likes: counts.numLikes ?? 0,
        comments: counts.numComments ?? 0,
        shares: counts.numShares ?? 0,
        clickCount: counts.numClicks ?? 0,
        fetchedAt: new Date(),
      },
    });
  }

  async getForUser(userId: string) {
    return this.prisma.postAnalytics.findMany({
      where: { draft: { userId } },
      include: { draft: { select: { id: true, finalContent: true, postedAt: true, contentType: true } } },
      orderBy: { fetchedAt: 'desc' },
      take: 20,
    });
  }

  private async fetchLinkedInStats(linkedinPostId: string, accessToken: string): Promise<LinkedInSocialCounts> {
    // LinkedIn socialActions API returns likes, comments, shares
    const socialRes = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(linkedinPostId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );

    const counts: LinkedInSocialCounts = {};

    if (socialRes.ok) {
      const data = await socialRes.json() as {
        likesSummary?: { totalLikes?: number };
        commentsSummary?: { totalFirstLevelComments?: number };
        sharesSummary?: { totalShares?: number };
      };
      counts.numLikes = data.likesSummary?.totalLikes ?? 0;
      counts.numComments = data.commentsSummary?.totalFirstLevelComments ?? 0;
      counts.numShares = data.sharesSummary?.totalShares ?? 0;
    } else {
      this.logger.warn(`LinkedIn socialActions returned ${socialRes.status} for ${linkedinPostId}`);
    }

    // LinkedIn shareStatistics API returns impressions + clicks
    // Requires r_organization_social or specific developer program access
    const statsRes = await fetch(
      `https://api.linkedin.com/v2/shareStatistics?q=shares&shares[0]=${encodeURIComponent(linkedinPostId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );

    if (statsRes.ok) {
      const data = await statsRes.json() as {
        elements?: Array<{ totalShareStatistics?: { impressionCount?: number; clickCount?: number } }>;
      };
      const stats = data.elements?.[0]?.totalShareStatistics;
      counts.numImpressions = stats?.impressionCount ?? 0;
      counts.numClicks = stats?.clickCount ?? 0;
    }
    // 403 is expected if impressions API scope not granted — treat as zero

    return counts;
  }
}
