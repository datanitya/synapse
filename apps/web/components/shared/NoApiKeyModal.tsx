'use client';

import Link from 'next/link';

interface NoApiKeyModalProps {
  onClose: () => void;
}

export default function NoApiKeyModal({ onClose }: NoApiKeyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-900/40 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="9" r="7.5" />
                  <line x1="9" y1="5.5" x2="9" y2="9.5" />
                  <circle cx="9" cy="12" r="0.5" fill="#f59e0b" stroke="none" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-semibold text-base">API key required</h2>
                <p className="text-slate-500 text-xs mt-0.5">You need your own API key to use this feature</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 mt-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            SYNAPSE uses AI to generate posts and analyze trends. To use these features, add your own API key from one of these providers:
          </p>

          <div className="space-y-2">
            {[
              { name: 'Google Gemini', note: 'Free tier available', color: 'text-blue-400', bg: 'bg-blue-950/20 border-blue-900/40' },
              { name: 'Anthropic Claude', note: 'Best quality', color: 'text-purple-400', bg: 'bg-purple-950/20 border-purple-900/40' },
              { name: 'OpenAI GPT-4o', note: 'Most popular', color: 'text-green-400', bg: 'bg-green-950/20 border-green-900/40' },
            ].map((p) => (
              <div key={p.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${p.bg}`}>
                <span className={`text-xs font-semibold ${p.color}`}>{p.name}</span>
                <span className="text-slate-600 text-xs ml-auto">{p.note}</span>
              </div>
            ))}
          </div>

          <p className="text-slate-500 text-xs leading-relaxed">
            Your API key is encrypted at rest and never shared. You only pay for what you use directly to the provider.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-700 text-slate-400 text-sm rounded-xl hover:border-slate-600 transition-colors"
          >
            Maybe later
          </button>
          <Link
            href="/settings"
            onClick={onClose}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors text-center"
          >
            Add API key →
          </Link>
        </div>
      </div>
    </div>
  );
}
