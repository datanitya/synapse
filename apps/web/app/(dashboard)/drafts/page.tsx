'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api-client';
import type { Draft, DraftStatus } from '@synapse/types';

const STATUS_TABS: DraftStatus[] = ['DRAFT', 'REFINED', 'APPROVED', 'PUBLISHED'];

const COL: Record<DraftStatus, { accent: string; label: string; dot: string; empty: string }> = {
  DRAFT:     { accent: 'bg-slate-500',   label: 'text-slate-400',  dot: 'bg-slate-500',  empty: 'Nothing in draft yet' },
  REFINED:   { accent: 'bg-amber-500',   label: 'text-amber-400',  dot: 'bg-amber-500',  empty: 'Nothing refined yet' },
  APPROVED:  { accent: 'bg-emerald-500', label: 'text-emerald-400',dot: 'bg-emerald-500',empty: 'Nothing approved yet' },
  PUBLISHED: { accent: 'bg-blue-500',    label: 'text-blue-400',   dot: 'bg-blue-500',   empty: 'Nothing published yet' },
  ARCHIVED:  { accent: 'bg-slate-700',   label: 'text-slate-600',  dot: 'bg-slate-700',  empty: '' },
};

const BADGE: Record<DraftStatus, string> = {
  DRAFT:     'bg-slate-800 text-slate-400',
  REFINED:   'bg-amber-900/40 text-amber-400',
  APPROVED:  'bg-emerald-900/40 text-emerald-400',
  PUBLISHED: 'bg-blue-900/40 text-blue-400',
  ARCHIVED:  'bg-slate-800 text-slate-600',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function fmtScheduled(iso: string) {
  return new Date(iso).toLocaleDateString('en', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function preview(d: Draft) {
  return d.finalContent ?? d.variations[0]?.content ?? '';
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<DraftStatus>('DRAFT');

  useEffect(() => {
    api.get<Draft[]>('/drafts').then(setDrafts).catch(console.error).finally(() => setLoading(false));
  }, []);

  const grouped: Record<string, Draft[]> = {
    DRAFT: drafts.filter((d) => d.status === 'DRAFT'),
    REFINED: drafts.filter((d) => d.status === 'REFINED'),
    APPROVED: drafts
      .filter((d) => d.status === 'APPROVED')
      .sort((a, b) => {
        if (a.suggestedPostAt && b.suggestedPostAt)
          return new Date(a.suggestedPostAt).getTime() - new Date(b.suggestedPostAt).getTime();
        if (a.suggestedPostAt) return -1;
        if (b.suggestedPostAt) return 1;
        return 0;
      }),
    PUBLISHED: drafts
      .filter((d) => d.status === 'PUBLISHED')
      .sort((a, b) =>
        new Date(b.postedAt ?? b.updatedAt).getTime() - new Date(a.postedAt ?? a.updatedAt).getTime(),
      ),
  };

  const inProgress = drafts.filter((d) => d.status !== 'PUBLISHED' && d.status !== 'ARCHIVED').length;
  const published = drafts.filter((d) => d.status === 'PUBLISHED').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Drafts</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {inProgress} in progress
            {published > 0 && <span className="text-emerald-500 ml-2">· {published} published</span>}
          </p>
        </div>
        <Link
          href="/compose"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
          </svg>
          New post
        </Link>
      </div>

      {loading ? (
        /* Skeleton */
        <div className="px-6 md:px-8 pb-8 grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
          {STATUS_TABS.map((s) => (
            <div key={s} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 h-11 animate-pulse bg-slate-800/60" />
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <p className="text-slate-500 text-base">No drafts yet</p>
          <Link href="/compose" className="text-blue-400 text-sm hover:underline mt-1 inline-block">
            Generate your first post →
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop kanban ── */}
          <div className="hidden md:grid md:grid-cols-4 gap-3 px-6 md:px-8 pb-6 min-h-0 flex-1">
            {STATUS_TABS.map((status) => {
              const items = grouped[status] ?? [];
              const col = COL[status];
              return (
                <div
                  key={status}
                  className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden min-h-0"
                >
                  {/* Column header */}
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                      <span className={`text-xs font-semibold uppercase tracking-widest ${col.label}`}>
                        {status}
                      </span>
                    </div>
                    <span className="text-slate-600 text-xs tabular-nums font-medium">{items.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                        <p className="text-slate-700 text-xs">{col.empty}</p>
                        {status === 'DRAFT' && (
                          <Link href="/compose" className="text-blue-500 text-xs hover:text-blue-400 mt-1.5 transition-colors">
                            Generate one →
                          </Link>
                        )}
                      </div>
                    ) : (
                      items.map((d) => {
                        const text = preview(d);
                        return (
                          <Link
                            key={d.id}
                            href={`/drafts/${d.id}`}
                            className="block bg-slate-800/30 rounded-lg border border-slate-700/20 p-3 hover:bg-slate-800/70 hover:border-slate-700/60 transition-all duration-150 group"
                          >
                            {d.title && (
                              <p className="text-white text-xs font-semibold mb-1 line-clamp-1">{d.title}</p>
                            )}
                            <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                              {text || <span className="italic text-slate-600">No content yet</span>}
                            </p>
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-700/30">
                              {status === 'PUBLISHED' && d.postedAt ? (
                                <span className="text-emerald-500 text-[10px] font-medium">✓ {fmtDate(d.postedAt)}</span>
                              ) : d.suggestedPostAt ? (
                                <span className="text-blue-400 text-[10px]">📅 {fmtDate(d.suggestedPostAt)}</span>
                              ) : (
                                <span className="text-slate-700 text-[10px]">{fmtDate(d.updatedAt)}</span>
                              )}
                              <span className="text-slate-700 text-xs group-hover:text-slate-500 transition-colors">→</span>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Mobile tabs + list ── */}
          <div className="md:hidden flex-1 flex flex-col min-h-0 px-4 pb-6">
            {/* Tabs */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {STATUS_TABS.map((s) => {
                const count = (grouped[s] ?? []).length;
                const active = mobileTab === s;
                return (
                  <button
                    key={s}
                    onClick={() => setMobileTab(s)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white/60' : COL[s].dot}`} />
                    {s}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${active ? 'bg-blue-500/60' : 'bg-slate-700 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active tab content */}
            <div className="space-y-2 overflow-y-auto flex-1">
              {(grouped[mobileTab] ?? []).length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-slate-500 text-sm">{COL[mobileTab].empty || 'Nothing here yet'}</p>
                  {mobileTab === 'DRAFT' && (
                    <Link href="/compose" className="text-blue-400 text-sm hover:underline mt-1 inline-block">
                      Generate one →
                    </Link>
                  )}
                </div>
              ) : (
                (grouped[mobileTab] ?? []).map((d) => {
                  const text = preview(d);
                  return (
                    <Link
                      key={d.id}
                      href={`/drafts/${d.id}`}
                      className="block bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 p-4 transition-colors"
                    >
                      {d.title && <p className="text-white text-sm font-semibold mb-1 line-clamp-1">{d.title}</p>}
                      <p className="text-slate-300 text-sm line-clamp-2 leading-relaxed">
                        {text || <span className="italic text-slate-500">No content yet</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${BADGE[d.status]}`}>
                          {d.status}
                        </span>
                        {d.status === 'PUBLISHED' && d.postedAt ? (
                          <span className="text-xs text-emerald-400">✓ {fmtScheduled(d.postedAt)}</span>
                        ) : d.suggestedPostAt ? (
                          <span className="text-xs text-blue-400">📅 {fmtScheduled(d.suggestedPostAt)}</span>
                        ) : null}
                        <span className="text-slate-600 text-xs ml-auto">{fmtDate(d.updatedAt)}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
