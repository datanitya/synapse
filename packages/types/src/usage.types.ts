export interface MonthlyUsage {
  month: string;
  total: number;
  byProvider: Partial<Record<'CLAUDE' | 'GEMINI' | 'OPENAI', number>>;
  totalCostUsd: number;
  costByProvider: Partial<Record<'CLAUDE' | 'GEMINI' | 'OPENAI', number>>;
  byPurpose: Record<string, number>;
}

export interface TokenUsageStats {
  currentMonth: MonthlyUsage;
  history: MonthlyUsage[];
}