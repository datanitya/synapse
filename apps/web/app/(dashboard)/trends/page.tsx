'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePostHog } from 'posthog-js/react';
import { api } from '../../../lib/api-client';
import type { TrendListResponse, TrendIntelligence } from '@synapse/types';

function ScorePill({ label, value, type }: { label: string; value: number; type: 'trend' | 'saturation' | 'opportunity' }) {
  const color =
    type === 'opportunity'
      ? value >= 7 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
        : value >= 4 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20'
        : 'bg-slate-700/40 text-slate-500 border-slate-600/20'
      : type === 'saturation'
      ? value >= 7 ? 'bg-red-500/15 text-red-400 border-red-500/20'
        : value >= 4 ? 'bg-orange-500/15 text-orange-400 border-orange-500/20'
        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
      : value >= 7 ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
        : value >= 4 ? 'bg-slate-600/40 text-slate-400 border-slate-600/20'
        : 'bg-slate-700/40 text-slate-500 border-slate-600/20';

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${color}`}>
      {label} {value}
    </span>
  );
}

const TONE_LABELS: Record<string, string> = {
  'bold-prediction': '🔮 Bold',
  'personal-story': '💬 Story',
  'industry-analysis': '📊 Analysis',
  'contrarian-take': '⚡ Contrarian',
  'practical-guide': '🛠 Guide',
  'thought-provoking-question': '❓ Question',
};

export default function TrendsPage() {
  const posthog = usePostHog();
  const [data, setData] = useState<TrendListResponse>({ trends: [], total: 0 });
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<TrendListResponse>('/trends?limit=20');
      setData(res);
      setSavedIds(new Set(res.trends.filter((t) => t.isSaved).map((t) => t.id)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await api.post('/trends/sync');
      await load();
    } finally {
      setSyncing(false);
    }
  }

  async function toggleSave(trendId: string) {
    const isSaved = savedIds.has(trendId);
    if (isSaved) {
      await api.delete(`/trends/${trendId}/save`);
      setSavedIds((prev) => { const s = new Set(prev); s.delete(trendId); return s; });
    } else {
      await api.post(`/trends/${trendId}/save`);
      setSavedIds((prev) => new Set([...prev, trendId]));
      posthog?.capture('trend_saved', { trendId });
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Trend Intelligence · filtered for your niche</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Trending Topics</h1>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
        >
          <svg
            width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            className={syncing ? 'animate-spin' : ''}
          >
            <path d="M11 6.5A4.5 4.5 0 106.5 11"/>
            <polyline points="11,3 11,6.5 7.5,6.5"/>
          </svg>
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-xl h-28 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : data.trends.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-slate-500 text-base">No trends yet</p>
          <p className="text-slate-600 text-sm mt-1">Click &quot;Sync now&quot; to fetch the latest from HackerNews &amp; Google News</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.trends.map((trend) => {
            const intel = trend.intelligence as TrendIntelligence | undefined;
            const isExpanded = expanded.has(trend.id);

            return (
              <div
                key={trend.id}
                className={`bg-slate-900 rounded-xl border transition-all duration-150 ${
                  intel && intel.opportunityScore >= 7
                    ? 'border-emerald-800/60 hover:border-emerald-700/80'
                    : intel && intel.opportunityScore >= 4
                    ? 'border-slate-700/80 hover:border-slate-600/80'
                    : 'border-slate-800 hover:border-slate-700/80'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Opportunity Score badge — primary differentiator */}
                    {intel && (
                      <div className={`shrink-0 flex flex-col items-center justify-center w-11 h-11 rounded-xl font-bold text-base tabular-nums border ${
                        intel.opportunityScore >= 7
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                          : intel.opportunityScore >= 4
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          : 'bg-slate-800/60 text-slate-500 border-slate-700/40'
                      }`}>
                        {intel.opportunityScore}
                        <span className="text-[8px] font-semibold opacity-60 leading-none mt-0.5">OPP</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-slate-100 font-medium leading-snug">{trend.title}</h3>

                      {/* Suggested angle — always visible, no expansion needed */}
                      {intel?.suggestedAngle && (
                        <p className="text-blue-400/80 text-xs mt-1.5 leading-relaxed font-medium">
                          → {intel.suggestedAngle}
                        </p>
                      )}

                      {trend.summary && !intel?.suggestedAngle && (
                        <p className="text-slate-500 text-sm mt-1.5 line-clamp-2 leading-relaxed">{trend.summary}</p>
                      )}

                      {/* Score pills + source row */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {trend.source === 'HACKERNEWS' ? (
                          <span className="text-slate-600 text-xs font-medium tabular-nums">↑ {trend.score.toLocaleString()}</span>
                        ) : trend.source === 'LINKEDIN' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-sky-900/30 text-sky-400 border border-sky-800/30 tracking-wide">
                            LinkedIn
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-900/30 text-blue-400 border border-blue-800/30 tracking-wide">
                            Google News
                          </span>
                        )}

                        {intel && (
                          <>
                            <ScorePill label="Trend" value={intel.trendScore} type="trend" />
                            <ScorePill label="Sat." value={intel.saturationScore} type="saturation" />
                          </>
                        )}

                        {trend.categories.slice(0, 2).map((c) => (
                          <span key={c} className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide">
                            {c}
                          </span>
                        ))}

                        {intel && (
                          <button
                            onClick={() => toggleExpand(trend.id)}
                            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors ml-auto"
                          >
                            {isExpanded ? '▲ less' : '▼ intel'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => toggleSave(trend.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          savedIds.has(trend.id)
                            ? 'border-amber-700/50 text-amber-400 bg-amber-900/20'
                            : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {savedIds.has(trend.id) ? '★ Saved' : '☆ Save'}
                      </button>
                      <Link
                        href={`/compose?trendId=${trend.id}&topic=${encodeURIComponent(trend.title)}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-center font-medium transition-colors"
                      >
                        Write post
                      </Link>
                    </div>
                  </div>

                  {/* Expanded intelligence panel */}
                  {isExpanded && intel && (
                    <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <IntelRow label="Why it matters" value={intel.whyItMatters} />
                      <IntelRow label="Suggested angle" value={intel.suggestedAngle} />
                      <div className="sm:col-span-2">
                        <IntelRow label="Opening hook" value={`"${intel.suggestedHook}"`} highlight />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-slate-600 text-[10px] uppercase tracking-wider">Tone</span>
                        <span className="text-slate-300 text-xs font-medium">
                          {TONE_LABELS[intel.suggestedTone] ?? intel.suggestedTone}
                        </span>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-slate-600 text-[10px] uppercase tracking-wider shrink-0 mt-0.5">Audience</span>
                        <span className="text-slate-400 text-xs leading-relaxed">{intel.suggestedAudience}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IntelRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-600 text-[10px] uppercase tracking-wider shrink-0 mt-0.5 w-24">{label}</span>
      <span className={`text-xs leading-relaxed ${highlight ? 'text-slate-200 italic' : 'text-slate-400'}`}>{value}</span>
    </div>
  );
}