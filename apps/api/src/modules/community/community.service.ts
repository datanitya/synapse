import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  async getNicheLeaderboard(niche: string, limit = 10) {
    // Find users who have this niche in their preferences
    const prefs = await this.prisma.userPreferences.findMany({
      where: { niches: { has: niche } },
      select: { userId: true },
      take: 200, // cap the pool for performance
    });

    const userIds = prefs.map((p) => p.userId);
    if (userIds.length === 0) return { niche, total: 0, entries: [] };

    // Get brand DNA scores for this pool (only users who have a score)
    const dnas = await this.prisma.brandDna.findMany({
      where: {
        userId: { in: userIds },
        brandScore: { not: null },
      },
      include: {
        user: { select: { name: true, profilePictureUrl: true } },
      },
      orderBy: { brandScore: 'desc' },
      take: limit,
    });

    return {
      niche,
      total: userIds.length,
      entries: dnas.map((d, i) => ({
        rank: i + 1,
        name: d.user.name,
        profilePictureUrl: d.user.profilePictureUrl,
        score: d.brandScore,
        level: this.scoreToLevel(d.brandScore ?? 0),
        hookStyle: d.hookStyle,
        samplesAnalyzed: d.samplesAnalyzed,
      })),
    };
  }

  async getNicheStats(niche: string) {
    const total = await this.prisma.userPreferences.count({
      where: { niches: { has: niche } },
    });

    const withDna = await this.prisma.brandDna.count({
      where: {
        user: { preferences: { niches: { has: niche } } },
        samplesAnalyzed: { gte: 3 },
      },
    });

    const publishedThisMonth = await this.prisma.draft.count({
      where: {
        status: 'PUBLISHED',
        postedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        user: { preferences: { niches: { has: niche } } },
      },
    });

    return { niche, totalCreators: total, activeCreators: withDna, postsThisMonth: publishedThisMonth };
  }

  async getAvailableNiches() {
    // Return niches that have at least 1 user with a brand score
    const results = await this.prisma.$queryRaw<Array<{ niche: string; count: bigint }>>`
      SELECT unnest(niches) as niche, COUNT(*) as count
      FROM "UserPreferences"
      GROUP BY niche
      ORDER BY count DESC
      LIMIT 20
    `;
    return results.map((r) => ({ niche: r.niche, creatorCount: Number(r.count) }));
  }

  private scoreToLevel(score: number): string {
    if (score >= 80) return 'Expert';
    if (score >= 60) return 'Established';
    if (score >= 40) return 'Growing';
    if (score >= 20) return 'Emerging';
    return 'New';
  }
}
