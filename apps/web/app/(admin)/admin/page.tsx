'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';

interface AdminStats {
  totalUsers: number;
  totalTokensThisMonth: number;
  totalCostUsd: number;
  byPlan: { plan: string; count: number }[];
}

function fmtUsd(n: number) {
  return '$' + (n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2));
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<AdminStats>('/admin/stats')
      .then(setStats)
      .catch(() => setError('Failed to load stats. Make sure your account has Admin role.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
      </div>
    );
  }

  if (error) return <div className="p-8 text-red-400 text-sm">{error}</div>;
  if (!stats) return null;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Platform-wide metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Total Users</p>
          <p className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Tokens This Month</p>
          <p className="text-3xl font-bold text-white">{stats.totalTokensThisMonth.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Est. Cost This Month</p>
          <p className="text-3xl font-bold text-white">{fmtUsd(stats.totalCostUsd)}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
        <h2 className="text-white font-semibold">Users by Plan</h2>
        <div className="space-y-2">
          {stats.byPlan.map((row) => (
            <div key={row.plan} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
              <span className="text-slate-300 text-sm">{row.plan}</span>
              <span className="text-white font-semibold">{row.count}</span>
            </div>
          ))}
          {stats.byPlan.length === 0 && <p className="text-slate-500 text-sm">No plan data yet.</p>}
        </div>
      </div>
    </div>
  );
}
