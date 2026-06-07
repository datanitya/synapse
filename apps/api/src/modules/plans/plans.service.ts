import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  getActivePlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceInr: 'asc' },
    });
  }

  async getUserPlanStatus(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });

    const { _sum } = await this.prisma.tokenUsageLog.aggregate({
      where: { userId, createdAt: { gte: monthStart } },
      _sum: { totalTokens: true },
    });

    const tokensUsed = _sum.totalTokens ?? 0;
    const limit = user?.plan?.monthlyTokenLimit ?? 100_000;

    return {
      plan: user?.plan ?? null,
      tokensUsed,
      monthlyLimit: limit,
      isUnlimited: limit === 0,
      percentUsed: limit > 0 ? Math.min(100, Math.round((tokensUsed / limit) * 100)) : 0,
    };
  }
}
