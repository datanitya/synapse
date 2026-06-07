'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api-client';
import type { Trend, Draft } from '@synapse/types';

interface PlanStatus {
  plan: { displayName: string } | null;
  tokensUsed: number;
  monthlyLimit: number;
  isUnlimited: boolean;
  percentUsed: number;
}

interface BrandScore {
  score: number;
  level: string;
  samplesAnalyzed: number;
  nextMilestone: string;
}

interface VoiceReport {
  report: string | null;
  updatedAt: string | null;
}

function formatScheduled(iso: string): string {
  return new Date(iso).toLocaleDateString('en', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatDay(): string {
  return new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function DashboardPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [approved, setApproved] = useState<Draft[]>([]);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [brandScore, setBrandScore] = useState<BrandScore | null>(null);
  const [voiceReport, setVoiceReport] = useState<VoiceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ trends: Trend[] }>('/trends?limit=3'),
      api.get<Draft[]>('/drafts?limit=5'),
      api.get<Draft[]>('/drafts?status=APPROVED'),
      api.get<PlanStatus>('/plans/status'),
      api.get<BrandScore>('/brand-memory/score').catch(() => null),
      api.get<VoiceReport>('/brand-memory/voice-report').catch(() => null),
    ]).then(([trendsRes, draftsRes, approvedRes, planRes, scoreRes, reportRes]) => {
      setTrends(trendsRes.trends);
      setDrafts(draftsRes);
      setApproved(approvedRes);
      setPlanStatus(planRes);
      setBrandScore(scoreRes);
      setVoiceReport(reportRes);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleGenerateReport() {
    setGeneratingReport(true);
    try {
      const res = await api.post<VoiceReport>('/brand-memory/voice-report');
      setVoiceReport(res);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingReport(false);
    }
  }

  const pendingDrafts = drafts.filter((d) => d.status === 'DRAFT' || d.status === 'REFINED');
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  const upcomingQueue = [...approved]
    .sort((a, b) => {
      const aTime = a.suggestedPostAt ? new Date(a.suggestedPostAt).getTime() : 0;
      const bTime = b.suggestedPostAt ? new Date(b.suggestedPostAt).getTime() : 0;
      const aFuture = aTime > now;
      const bFuture = bTime > now;
      if (aFuture && !bFuture) return -1;
      if (!aFuture && bFuture) return 1;
      if (aFuture && bFuture) return aTime - bTime;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, 3);

  const scheduledThisWeek = approved.filter((d) => {
    if (!d.suggestedPostAt) return false;
    const t = new Date(d.suggestedPostAt).getTime();
    return t > now && t <= now + oneWeek;
  }).length;

  async function handleSync() {
    setSyncing(true);
    try {
      await api.post('/trends/sync');
      const res = await api.get<{ trends: Trend[] }>('/trends?limit=3');
      setTrends(res.trends);
    } finally {
      setSyncing(false);
    }
  }

  const STATS = [
    {
      label: 'Pending',
      value: pendingDrafts.length,
      sub: 'drafts to refine',
      accent: 'from-amber-500/40 to-transparent',
    },
    {
      label: 'Approved',
      value: approved.length,
      sub: 'ready to post',
      accent: 'from-emerald-500/40 to-transparent',
    },
    {
      label: 'Scheduled',
      value: scheduledThisWeek,
      sub: 'this week',
      accent: 'from-blue-500/40 to-transparent',
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">{formatDay()}</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Good to have you back</h1>
        </div>
        <Link
          href="/compose"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/>
          </svg>
          New post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="relative bg-slate-900 rounded-xl p-5 border border-slate-800 overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${s.accent}`} />
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-4xl font-bold text-white mt-2 tabular-nums leading-none">
              {loading ? <span className="inline-block w-8 h-9 bg-slate-800 rounded animate-pulse" /> : s.value}
            </p>
            <p className="text-slate-600 text-xs mt-2">{s.sub}</p>
          </div>
        ))}

        {/* CTA card */}
        <Link
          href="/compose"
          className="sm:hidden relative bg-blue-600 hover:bg-blue-500 rounded-xl p-5 border border-blue-500/50 overflow-hidden transition-colors"
        >
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Quick action</p>
          <p className="text-white font-semibold mt-2 text-sm">Generate a post →</p>
        </Link>
      </div>

      {/* Token usage */}
      {planStatus && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Token usage</p>
              {planStatus.plan && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-medium">
                  {planStatus.plan.displayName}
                </span>
              )}
            </div>
            {!planStatus.isUnlimited && planStatus.percentUsed >= 80 && (
              <Link href="/billing" className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                Upgrade plan →
              </Link>
            )}
          </div>
          {planStatus.isUnlimited ? (
            <p className="text-slate-500 text-sm">Unlimited — no token cap on your plan.</p>
          ) : (
            <div className="space-y-1.5">
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    planStatus.percentUsed >= 90 ? 'bg-red-500' :
                    planStatus.percentUsed >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${planStatus.percentUsed}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{planStatus.tokensUsed.toLocaleString()} used</span>
                <span>{(planStatus.monthlyLimit - planStatus.tokensUsed).toLocaleString()} remaining this month</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brand Score + Voice Report */}
      {(loading || brandScore) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Brand Score */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">Brand Score</p>
            {loading ? (
              <div className="h-16 bg-slate-800 rounded-lg animate-pulse" />
            ) : brandScore ? (
              <div className="flex items-center gap-5">
                {/* Score ring */}
                <div className="relative shrink-0">
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="30" fill="none" stroke="#1e293b" strokeWidth="6" />
                    <circle
                      cx="36" cy="36" r="30" fill="none"
                      stroke={brandScore.score >= 80 ? '#10b981' : brandScore.score >= 60 ? '#3b82f6' : brandScore.score >= 40 ? '#f59e0b' : '#64748b'}
                      strokeWidth="6"
                      strokeDasharray={`${(brandScore.score / 100) * 188.5} 188.5`}
                      strokeLinecap="round"
                      transform="rotate(-90 36 36)"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg tabular-nums">
                    {brandScore.score}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-base">{brandScore.level}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{brandScore.nextMilestone}</p>
                  <p className="text-slate-600 text-[10px] mt-2">{brandScore.samplesAnalyzed} edits analyzed</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Voice Report */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Voice Report</p>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40"
              >
                {generatingReport ? 'Generating…' : 'Refresh'}
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <div key={i} className="h-3 bg-slate-800 rounded animate-pulse" style={{ width: `${85 - i * 15}%` }} />)}
              </div>
            ) : voiceReport?.report ? (
              <div>
                <p className="text-slate-300 text-sm leading-relaxed">{voiceReport.report}</p>
                {voiceReport.updatedAt && (
                  <p className="text-slate-600 text-[10px] mt-3">
                    Updated {new Date(voiceReport.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-600 text-sm">No report yet</p>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="text-blue-400 text-xs hover:underline mt-1 disabled:opacity-40"
                >
                  {generatingReport ? 'Generating…' : 'Generate your first report →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming queue */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white text-sm font-semibold">Upcoming queue</h2>
          <Link href="/drafts" className="text-slate-500 hover:text-blue-400 text-xs transition-colors">
            All drafts →
          </Link>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : upcomingQueue.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-slate-600 text-sm">No approved drafts yet</p>
            <Link href="/drafts" className="text-blue-400 text-xs hover:underline mt-1 inline-block">
              Approve a draft to see it here →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {upcomingQueue.map((d, i) => {
              const isFuture = d.suggestedPostAt && new Date(d.suggestedPostAt).getTime() > now;
              return (
                <Link
                  key={d.id}
                  href={`/drafts/${d.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/40 transition-colors group"
                >
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 tracking-wider ${
                    i === 0 ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-600'
                  }`}>
                    {i === 0 ? 'NEXT' : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm line-clamp-1">
                      {d.finalContent ?? d.variations[0]?.content ?? 'Draft'}
                    </p>
                    <p className={`text-xs mt-0.5 ${isFuture ? 'text-blue-400' : 'text-emerald-400'}`}>
                      {isFuture ? `📅 ${formatScheduled(d.suggestedPostAt!)}` : '✓ Ready to post'}
                    </p>
                  </div>
                  <span className="text-slate-700 group-hover:text-slate-500 text-sm transition-colors shrink-0">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Trends */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white text-sm font-semibold">Top Trends</h2>
            <div className="flex items-center gap-3">
              {!loading && trends.length === 0 && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-blue-400 text-xs hover:underline disabled:opacity-50 transition-opacity"
                >
                  {syncing ? 'Syncing…' : 'Sync'}
                </button>
              )}
              <Link href="/trends" className="text-slate-500 hover:text-blue-400 text-xs transition-colors">
                View all →
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />)}
            </div>
          ) : trends.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-slate-600 text-sm">No trends yet</p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-blue-400 text-xs hover:underline mt-1 disabled:opacity-50"
              >
                {syncing ? 'Syncing…' : 'Fetch from HackerNews →'}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {trends.map((t) => (
                <div key={t.id} className="px-5 py-4">
                  <p className="text-slate-200 text-sm font-medium line-clamp-2 leading-snug">{t.title}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-slate-600 text-xs tabular-nums">↑ {t.score}</span>
                    {t.categories.slice(0, 2).map((c) => (
                      <span key={c} className="bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Drafts */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white text-sm font-semibold">Recent Drafts</h2>
            <Link href="/drafts" className="text-slate-500 hover:text-blue-400 text-xs transition-colors">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />)}
            </div>
          ) : drafts.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-slate-600 text-sm">No drafts yet</p>
              <Link href="/compose" className="text-blue-400 text-xs hover:underline mt-1 inline-block">
                Create your first →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {drafts.slice(0, 4).map((d) => (
                <Link
                  key={d.id}
                  href={`/drafts/${d.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-800/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm line-clamp-1">
                      {d.finalContent ?? d.variations[0]?.content ?? 'Draft'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider ${
                        d.status === 'APPROVED' ? 'text-emerald-400 bg-emerald-900/30' :
                        d.status === 'REFINED' ? 'text-amber-400 bg-amber-900/30' :
                        'text-slate-500 bg-slate-800'
                      }`}>{d.status}</span>
                      {d.suggestedPostAt && (
                        <span className="text-blue-400 text-xs">📅 {formatScheduled(d.suggestedPostAt)}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-700 group-hover:text-slate-500 text-sm transition-colors shrink-0">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
