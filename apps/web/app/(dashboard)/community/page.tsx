'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';

interface LeaderboardEntry {
  rank: number;
  name: string;
  profilePictureUrl: string | null;
  score: number;
  level: string;
  hookStyle: string | null;
  samplesAnalyzed: number;
}

interface LeaderboardResponse {
  niche: string;
  total: number;
  entries: LeaderboardEntry[];
}

interface NicheOption {
  niche: string;
  creatorCount: number;
}

const LEVEL_COLORS: Record<string, string> = {
  Expert: 'text-emerald-400',
  Established: 'text-blue-400',
  Growing: 'text-yellow-400',
  Emerging: 'text-slate-400',
  New: 'text-slate-500',
};

export default function CommunityPage() {
  const [niches, setNiches] = useState<NicheOption[]>([]);
  const [selectedNiche, setSelectedNiche] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [nichesLoading, setNichesLoading] = useState(true);

  useEffect(() => {
    api.get<NicheOption[]>('/community/niches')
      .then((data) => {
        setNiches(data);
        if (data[0]) setSelectedNiche(data[0].niche);
      })
      .catch(console.error)
      .finally(() => setNichesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedNiche) return;
    setLoading(true);
    api.get<LeaderboardResponse>(`/community/leaderboard?niche=${encodeURIComponent(selectedNiche)}`)
      .then(setLeaderboard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedNiche]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Brand Intelligence</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Niche Leaderboard</h1>
        <p className="text-slate-500 text-sm mt-1">Top creators ranked by Brand Score within each niche.</p>
      </div>

      {/* Niche selector */}
      {nichesLoading ? (
        <div className="h-10 bg-slate-800 rounded-lg animate-pulse w-64" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {niches.map((n) => (
            <button
              key={n.niche}
              onClick={() => setSelectedNiche(n.niche)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                selectedNiche === n.niche
                  ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {n.niche}
              <span className="ml-1.5 opacity-50">{n.creatorCount}</span>
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {leaderboard && (
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white text-sm font-semibold">{leaderboard.niche}</h2>
            <span className="text-slate-600 text-xs">{leaderboard.total} creator{leaderboard.total !== 1 ? 's' : ''} in this niche</span>
          </div>
        )}

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !leaderboard || leaderboard.entries.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-slate-600 text-sm">No creators with Brand Scores in this niche yet.</p>
            <p className="text-slate-700 text-xs mt-1">Scores appear after editing at least 3 AI-generated posts.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {leaderboard.entries.map((entry) => (
              <div key={entry.rank} className="flex items-center gap-4 px-5 py-4">
                {/* Rank */}
                <span className={`text-sm font-bold tabular-nums w-6 shrink-0 ${
                  entry.rank === 1 ? 'text-yellow-400' :
                  entry.rank === 2 ? 'text-slate-400' :
                  entry.rank === 3 ? 'text-amber-600' : 'text-slate-600'
                }`}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </span>

                {/* Avatar */}
                {entry.profilePictureUrl ? (
                  <img src={entry.profilePictureUrl} alt={entry.name} className="w-9 h-9 rounded-full shrink-0 object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="text-slate-500 text-sm font-bold">{entry.name[0]}</span>
                  </div>
                )}

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{entry.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold ${LEVEL_COLORS[entry.level] ?? 'text-slate-500'}`}>
                      {entry.level}
                    </span>
                    {entry.hookStyle && (
                      <span className="text-[10px] text-slate-600">{entry.hookStyle}</span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="shrink-0 text-right">
                  <p className="text-white font-bold text-lg tabular-nums leading-none">{entry.score}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">{entry.samplesAnalyzed} edits</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
