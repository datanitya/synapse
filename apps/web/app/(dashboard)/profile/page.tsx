'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';
import type { UserWithPreferences } from '@synapse/types';

interface BrandDna {
  hookStyle?: string | null;
  tone?: string | null;
  paragraphLength?: string | null;
  emojiUsage?: string | null;
  preferredTopics?: string[];
  avgPostLength?: number | null;
  samplesAnalyzed?: number;
  rawDna?: { summary?: string } | null;
  updatedAt?: string;
}

function DnaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-slate-500 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-white text-sm font-medium capitalize">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserWithPreferences | null>(null);
  const [dna, setDna] = useState<BrandDna | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<UserWithPreferences>('/users/me'),
      api.get<BrandDna | null>('/brand-memory/dna').catch(() => null),
    ]).then(([u, d]) => {
      setUser(u);
      setDna(d);
    }).finally(() => setLoading(false));
  }, []);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeMsg('');
    try {
      const result = await api.post<{ analyzed: boolean; dna?: BrandDna; reason?: string; summary?: string }>('/brand-memory/analyze');
      if (result.analyzed && result.dna) {
        setDna(result.dna);
        setAnalyzeMsg(result.summary ? `Done: "${result.summary}"` : 'Analysis complete.');
      } else {
        setAnalyzeMsg(result.reason ?? 'Not enough edits yet. Edit a few generated posts first.');
      }
    } catch {
      setAnalyzeMsg('Analysis failed. Try again later.');
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-32 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />
        <div className="h-48 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />
      </div>
    );
  }

  if (!user) return <div className="p-8 text-slate-400">Could not load profile.</div>;

  const hasDna = dna && (dna.samplesAnalyzed ?? 0) >= 3;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Account</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Profile</h1>
      </div>

      {/* LinkedIn identity */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-5">
        <div className="flex items-center gap-4">
          {user.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profilePictureUrl} alt={user.name} className="w-16 h-16 rounded-full ring-2 ring-slate-700" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 text-xl font-bold">
              {user.name[0]}
            </div>
          )}
          <div>
            <p className="text-white text-lg font-semibold">{user.name}</p>
            <p className="text-slate-400 text-sm">{user.email}</p>
            {user.headline && <p className="text-slate-500 text-sm mt-0.5">{user.headline}</p>}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-300 text-sm">Connected via LinkedIn</span>
            <span className="text-xs text-green-400 ml-auto">✓ Active</span>
          </div>
          {user.linkedinProfileUrl && (
            <a
              href={user.linkedinProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
            >
              View LinkedIn profile →
            </a>
          )}
        </div>
      </div>

      {/* Brand DNA */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Brand DNA</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {hasDna
                ? `Inferred from ${dna.samplesAnalyzed} post edits — used to improve AI generation`
                : 'Edit generated posts to teach SYNAPSE your writing style'}
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="text-xs px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 disabled:opacity-50 transition-colors"
          >
            {analyzing ? 'Analyzing…' : hasDna ? 'Refresh' : 'Analyze now'}
          </button>
        </div>

        {analyzeMsg && (
          <div className="px-5 py-2 bg-blue-600/10 border-b border-slate-800 text-blue-400 text-xs">
            {analyzeMsg}
          </div>
        )}

        {hasDna ? (
          <div className="p-5">
            {dna.rawDna?.summary && (
              <p className="text-slate-300 text-sm mb-4 italic">&quot;{dna.rawDna.summary}&quot;</p>
            )}
            <div className="space-y-0">
              {dna.hookStyle && <DnaChip label="Hook style" value={dna.hookStyle} />}
              {dna.tone && <DnaChip label="Tone" value={dna.tone} />}
              {dna.paragraphLength && <DnaChip label="Paragraph length" value={dna.paragraphLength} />}
              {dna.emojiUsage && <DnaChip label="Emoji usage" value={dna.emojiUsage} />}
              {dna.avgPostLength && <DnaChip label="Avg post length" value={`~${dna.avgPostLength} words`} />}
              {dna.preferredTopics && dna.preferredTopics.length > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 text-xs uppercase tracking-wider">Preferred topics</span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                    {dna.preferredTopics.map((t) => (
                      <span key={t} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {dna.updatedAt && (
              <p className="text-slate-600 text-xs mt-4">
                Last updated {new Date(dna.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm mb-1">No Brand DNA yet</p>
            <p className="text-slate-600 text-xs">
              Generate a few posts, edit them to match your voice, then click &quot;Analyze now&quot; — SYNAPSE will learn your style.
            </p>
          </div>
        )}
      </div>

      {/* Account info */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider text-slate-400">Account details</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400 text-sm">Email</span>
            <span className="text-white text-sm">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <span className="text-slate-400 text-sm">Auth method</span>
            <span className="text-white text-sm">LinkedIn OAuth</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400 text-sm">Member since</span>
            <span className="text-white text-sm">
              {new Date(user.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-xs text-center">
        Profile information is pulled from your LinkedIn account and updates on each login.
      </p>
    </div>
  );
}
