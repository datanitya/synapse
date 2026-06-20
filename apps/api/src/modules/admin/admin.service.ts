import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':                    { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':               { input: 0.15,  output: 0.60  },
  'claude-opus-4-7':           { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'gemini-2.0-flash':          { input: 0.10,  output: 0.40  },
  'gemini-2.0-flash-lite':     { input: 0.075, output: 0.30  },
  'gemini-1.5-pro':            { input: 1.25,  output: 5.00  },
};

function computeCost(model: string, promptTokens: number, completionTokens: number) {
  const r = MODEL_PRICING[model] ?? { input: 0, output: 0 };
  return (promptTokens * r.input + completionTokens * r.output) / 1_000_000;
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, planCounts, tokenRows] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['planId'], _count: { id: true } }),
      this.prisma.tokenUsageLog.groupBy({
        by: ['model'],
        where: { createdAt: { gte: monthStart } },
        _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
      }),
    ]);

    const totalTokensThisMonth = tokenRows.reduce((s, r) => s + (r._sum.totalTokens ?? 0), 0);
    const totalCostUsd = tokenRows.reduce((s, r) =>
      s + computeCost(r.model, r._sum.promptTokens ?? 0, r._sum.completionTokens ?? 0), 0);

    const plans = await this.prisma.plan.findMany();
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

    const byPlan = planCounts.map((pc) => ({
      plan: pc.planId ? (planMap[pc.planId]?.displayName ?? 'Unknown') : 'No Plan',
      count: pc._count.id,
    }));

    return { totalUsers, totalTokensThisMonth, totalCostUsd, byPlan };
  }

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
      this.prisma.user.count(),
    ]);

    const tokensByUser = await this.prisma.tokenUsageLog.groupBy({
      by: ['userId'],
      where: {
        userId: { in: users.map((u) => u.id) },
        createdAt: { gte: monthStart },
      },
      _sum: { totalTokens: true },
    });

    const tokenMap = Object.fromEntries(
      tokensByUser.map((r) => [r.userId, r._sum.totalTokens ?? 0])
    );

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        profilePictureUrl: u.profilePictureUrl,
        role: u.role,
        plan: u.plan,
        planSince: u.planSince,
        tokensThisMonth: tokenMap[u.id] ?? 0,
        percentUsed: u.plan && u.plan.monthlyTokenLimit > 0
          ? Math.min(100, Math.round(((tokenMap[u.id] ?? 0) / u.plan.monthlyTokenLimit) * 100))
          : 0,
        createdAt: u.createdAt,
        usePlatformKey: (u as unknown as { usePlatformKey?: boolean }).usePlatformKey ?? false,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { plan: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    const history = [];
    for (let i = 0; i < 6; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const { _sum } = await this.prisma.tokenUsageLog.aggregate({
        where: { userId, createdAt: { gte: start, lt: end } },
        _sum: { totalTokens: true },
      });
      history.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        tokens: _sum.totalTokens ?? 0,
      });
    }

    return { ...user, usageHistory: history };
  }

  async assignPlan(actor: { id: string; email: string }, userId: string, planId: string) {
    const [plan, user] = await Promise.all([
      this.prisma.plan.findUnique({ where: { id: planId } }),
      this.prisma.user.findUnique({ where: { id: userId }, include: { plan: true } }),
    ]);
    if (!plan) throw new NotFoundException('Plan not found');
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { planId, planSince: new Date() },
      include: { plan: true },
    });

    await this.writeAudit(actor, 'assign_plan', 'user', userId, {
      from: user.plan?.displayName ?? null,
      to: plan.displayName,
    });

    return updated;
  }

  getPlans() {
    return this.prisma.plan.findMany({ orderBy: { priceInr: 'asc' } });
  }

  async getPayments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [payments, total, monthAgg, allTimeAgg, failedCount] = await Promise.all([
      this.prisma.paymentLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentLog.count(),
      this.prisma.paymentLog.aggregate({
        where: { status: 'captured', createdAt: { gte: monthStart } },
        _sum: { amountPaise: true },
        _count: { id: true },
      }),
      this.prisma.paymentLog.aggregate({
        where: { status: 'captured' },
        _sum: { amountPaise: true },
        _count: { id: true },
      }),
      this.prisma.paymentLog.count({ where: { status: 'failed' } }),
    ]);

    return {
      payments,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: {
        totalRevenueInr: Math.round((allTimeAgg._sum.amountPaise ?? 0) / 100),
        monthRevenueInr: Math.round((monthAgg._sum.amountPaise ?? 0) / 100),
        totalTransactions: allTimeAgg._count.id,
        monthTransactions: monthAgg._count.id,
        failedPayments: failedCount,
      },
    };
  }

  async updatePlan(
    actor: { id: string; email: string },
    planId: string,
    data: { displayName?: string; monthlyTokenLimit?: number; priceInr?: number; features?: string[]; isActive?: boolean; razorpayPlanId?: string | null; stripePriceId?: string | null },
  ) {
    try {
      const updated = await this.prisma.plan.update({ where: { id: planId }, data });
      await this.writeAudit(actor, 'update_plan', 'plan', planId, { changes: data });
      return updated;
    } catch (e: any) {
      if (e?.code === 'P2025') throw new NotFoundException('Plan not found');
      throw e;
    }
  }

  async setPlatformAccess(actor: { id: string; email: string }, userId: string, allow: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { usePlatformKey: allow } as object,
    });

    await this.writeAudit(actor, allow ? 'grant_platform_access' : 'revoke_platform_access', 'user', userId, {
      targetEmail: user.email,
    });

    return { userId, usePlatformKey: allow };
  }

  getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return this.prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async writeAudit(
    actor: { id: string; email: string },
    action: string,
    targetType: string,
    targetId: string,
    meta?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: { actorId: actor.id, actorEmail: actor.email, action, targetType, targetId, meta },
    });
  }
}
