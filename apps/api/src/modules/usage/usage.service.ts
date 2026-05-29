import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':                    { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':               { input: 0.15,  output: 0.60  },
  'dall-e-3':                  { input: 0,     output: 0     },
  'claude-opus-4-7':           { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'gemini-1.5-flash':          { input: 0.075, output: 0.30  },
  'gemini-1.5-pro':            { input: 1.25,  output: 5.00  },
  'gemini-2.0-flash':          { input: 0.10,  output: 0.40  },
  'gemini-2.0-flash-lite':     { input: 0.075, output: 0.30  },
};

function computeCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = MODEL_PRICING[model] ?? { input: 0, output: 0 };
  return (promptTokens * rates.input + completionTokens * rates.output) / 1_000_000;
}

function buildMonthStats(rows: {
  provider: string;
  model: string;
  purpose: string;
  _sum: { totalTokens: number | null; promptTokens: number | null; completionTokens: number | null };
}[]) {
  const byProvider: Record<string, number> = {};
  const costByProvider: Record<string, number> = {};
  const byPurpose: Record<string, number> = {};
  let total = 0;
  let totalCostUsd = 0;

  for (const row of rows) {
    const tokens = row._sum.totalTokens ?? 0;
    const cost = computeCost(row.model, row._sum.promptTokens ?? 0, row._sum.completionTokens ?? 0);
    byProvider[row.provider] = (byProvider[row.provider] ?? 0) + tokens;
    costByProvider[row.provider] = (costByProvider[row.provider] ?? 0) + cost;
    byPurpose[row.purpose] = (byPurpose[row.purpose] ?? 0) + tokens;
    total += tokens;
    totalCostUsd += cost;
  }

  return { byProvider, costByProvider, byPurpose, total, totalCostUsd };
}

@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  async getStats(_userId: string) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Query ALL token usage (user-generated + system background calls)
    const currentRows = await this.prisma.tokenUsageLog.groupBy({
      by: ['provider', 'model', 'purpose'],
      where: { createdAt: { gte: currentMonthStart, lt: nextMonthStart } },
      _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
    });

    const current = buildMonthStats(currentRows);

    const history = [];
    for (let i = 1; i <= 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const rows = await this.prisma.tokenUsageLog.groupBy({
        by: ['provider', 'model', 'purpose'],
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
        _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
      });

      const m = buildMonthStats(rows);
      if (m.total > 0) {
        history.push({
          month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
          ...m,
        });
      }
    }

    return {
      currentMonth: {
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        ...current,
      },
      history,
    };
  }
}