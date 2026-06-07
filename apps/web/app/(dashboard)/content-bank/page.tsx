'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api-client';
import type { ContentType, Draft, DraftStatus } from '@synapse/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function charLimitForType(type: ContentType): number {
  if (type === 'POST') return 3000;
  if (type === 'CAPTION') return 2200;
  return Infinity;
}

function schedulePresets(): Array<{ label: string; value: string }> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7));
  nextFriday.setHours(9, 0, 0, 0);

  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((1 - now.getDay() + 7) % 7 || 7));
  nextMonday.setHours(8, 0, 0, 0);

  const nextWed = new Date(now);
  nextWed.setDate(now.getDate() + ((3 - now.getDay() + 7) % 7 || 7));
  nextWed.setHours(12, 0, 0, 0);

  return [
    { label: 'Tomorrow 8am', value: fmt(tomorrow) },
    { label: 'Fri 9am', value: fmt(nextFriday) },
    { label: 'Mon 8am', value: fmt(nextMonday) },
    { label: 'Wed 12pm', value: fmt(nextWed) },
  ];
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Build a 42-cell (6×7) grid for a given month, starting from Monday
function buildCalendarCells(monthStart: Date): Date[] {
  const cells: Date[] = [];
  const first = new Date(monthStart);
  const dow = first.getDay(); // 0=Sun
  first.setDate(first.getDate() - (dow === 0 ? 6 : dow - 1));
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(first));
    first.setDate(first.getDate() + 1);
  }
  return cells;
}

function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function relativeDayLabel(dateKey: string): string {
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(new Date(Date.now() + 86_400_000));
  if (dateKey === today) return 'Today';
  if (dateKey === tomorrow) return 'Tomorrow';
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ContentType, {
  accent: string;
  hoverBorder: string;
  badge: string;
  dot: string;
  icon: string;
  desc: string;
}> = {
  POST: {
    accent: 'from-blue-600 to-blue-500',
    hoverBorder: 'hover:border-blue-800/60',
    badge: 'bg-blue-950 text-blue-400 border border-blue-900/60',
    dot: 'bg-blue-500',
    icon: '✍️',
    desc: 'LinkedIn post, 3000 chars',
  },
  BLOG: {
    accent: 'from-purple-600 to-purple-500',
    hoverBorder: 'hover:border-purple-800/60',
    badge: 'bg-purple-950 text-purple-400 border border-purple-900/60',
    dot: 'bg-purple-500',
    icon: '📝',
    desc: 'Long-form article with title',
  },
  CAPTION: {
    accent: 'from-yellow-600 to-yellow-500',
    hoverBorder: 'hover:border-yellow-800/60',
    badge: 'bg-yellow-950 text-yellow-500 border border-yellow-900/60',
    dot: 'bg-yellow-500',
    icon: '💬',
    desc: 'Image caption, 2200 chars',
  },
  IMAGE: {
    accent: 'from-pink-600 to-pink-500',
    hoverBorder: 'hover:border-pink-800/60',
    badge: 'bg-pink-950 text-pink-400 border border-pink-900/60',
    dot: 'bg-pink-500',
    icon: '🖼️',
    desc: 'Visual content with caption',
  },
};

const STATUS_BADGE: Record<DraftStatus, string> = {
  DRAFT: 'bg-slate-800 text-slate-500',
  REFINED: 'bg-yellow-900/40 text-yellow-400',
  APPROVED: 'bg-green-900/40 text-green-400',
  PUBLISHED: 'bg-blue-900/40 text-blue-400',
  ARCHIVED: 'bg-slate-800/50 text-slate-600',
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContentBankPage() {
  const [items, setItems] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<ContentType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get<Draft[]>('/content-bank').then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = {
    total: items.length,
    published: items.filter((i) => i.status === 'PUBLISHED').length,
    approved: items.filter((i) => i.status === 'APPROVED').length,
    scheduled: items.filter((i) => i.suggestedPostAt && i.status !== 'PUBLISHED').length,
  };

  const filtered = items
    .filter((i) => filter === 'ALL' || i.contentType === filter)
    .filter((i) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return i.title?.toLowerCase().includes(q) || i.finalContent?.toLowerCase().includes(q);
    });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Library</p>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Content Bank</h1>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total items', value: stats.total, accent: 'from-slate-500/60 to-transparent', color: 'text-white' },
              { label: 'Published', value: stats.published, accent: 'from-green-500/60 to-transparent', color: 'text-green-400' },
              { label: 'Approved', value: stats.approved, accent: 'from-blue-500/60 to-transparent', color: 'text-blue-400' },
              { label: 'Scheduled', value: stats.scheduled, accent: 'from-purple-500/60 to-transparent', color: 'text-purple-400' },
            ].map((s) => (
              <div key={s.label} className="relative bg-slate-900/60 rounded-xl border border-slate-800/60 px-4 py-3 overflow-hidden">
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${s.accent}`} />
                <p className={`text-2xl font-bold tabular-nums leading-none ${s.color}`}>
                  {loading ? <span className="inline-block w-8 h-7 bg-slate-800 rounded animate-pulse" /> : s.value}
                </p>
                <p className="text-slate-500 text-xs uppercase tracking-wider mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 focus-within:border-slate-600 rounded-xl px-3 py-2 flex-1 min-w-[180px] transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-600 shrink-0">
                <circle cx="6" cy="6" r="4.5" /><path d="M10 10l2.5 2.5" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search content…"
                className="bg-transparent text-sm text-white placeholder-slate-600 flex-1 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 transition-colors text-sm">✕</button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ALL', 'POST', 'BLOG', 'CAPTION', 'IMAGE'] as Array<ContentType | 'ALL'>).map((t) => {
                const count = t === 'ALL' ? items.length : items.filter((i) => i.contentType === t).length;
                const isActive = filter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                      isActive
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {t !== 'ALL' && (
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_CONFIG[t as ContentType].dot}`} />
                    )}
                    {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                    <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                title="Grid view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="0.5" y="0.5" width="5.5" height="5.5" rx="1" /><rect x="8" y="0.5" width="5.5" height="5.5" rx="1" />
                  <rect x="0.5" y="8" width="5.5" height="5.5" rx="1" /><rect x="8" y="8" width="5.5" height="5.5" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                title="List view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="3" x2="13" y2="3" /><line x1="3" y1="7" x2="13" y2="7" /><line x1="3" y1="11" x2="13" y2="11" />
                  <circle cx="1" cy="3" r="0.5" fill="currentColor" stroke="none" />
                  <circle cx="1" cy="7" r="0.5" fill="currentColor" stroke="none" />
                  <circle cx="1" cy="11" r="0.5" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                title="Calendar view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="1" y="2" width="12" height="11" rx="1.5" />
                  <line x1="1" y1="5.5" x2="13" y2="5.5" />
                  <line x1="4.5" y1="1" x2="4.5" y2="3.5" />
                  <line x1="9.5" y1="1" x2="9.5" y2="3.5" />
                  <rect x="3.5" y="7.5" width="2" height="2" rx="0.4" fill="currentColor" stroke="none" />
                  <rect x="6.5" y="7.5" width="2" height="2" rx="0.4" fill="currentColor" stroke="none" />
                  <rect x="9.5" y="7.5" width="1" height="2" rx="0.4" fill="currentColor" stroke="none" />
                </svg>
              </button>
            </div>

            {/* New button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all duration-150 shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="1" x2="6" y2="11" /><line x1="1" y1="6" x2="11" y2="6" />
              </svg>
              New item
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-2'}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-900 rounded-2xl border border-slate-800 animate-pulse overflow-hidden">
                  <div className="h-1 bg-slate-800" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-slate-800 rounded-full w-3/4" />
                    <div className="h-3 bg-slate-800 rounded-full w-full" />
                    <div className="h-3 bg-slate-800 rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              {search ? (
                <>
                  <p className="text-slate-400 text-base">No results for &ldquo;{search}&rdquo;</p>
                  <button onClick={() => setSearch('')} className="text-blue-400 text-sm hover:underline">Clear search</button>
                </>
              ) : filter !== 'ALL' ? (
                <>
                  <p className="text-slate-400 text-base">No {filter.toLowerCase()} content yet</p>
                  <button onClick={() => setShowModal(true)} className="text-blue-400 text-sm hover:underline">
                    Add your first {filter.toLowerCase()} →
                  </button>
                </>
              ) : (
                <>
                  <p className="text-slate-400 text-base">Your content bank is empty</p>
                  <p className="text-slate-600 text-sm">Store posts, blogs, captions and images here for reuse</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors mt-2"
                  >
                    Add first item →
                  </button>
                </>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* New item ghost card */}
              <button
                onClick={() => setShowModal(true)}
                className="group bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 min-h-[180px] flex flex-col items-center justify-center gap-3 p-6 text-center transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-slate-500 group-hover:text-slate-300 transition-colors">
                    <line x1="9" y1="1" x2="9" y2="17" /><line x1="1" y1="9" x2="17" y2="9" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium group-hover:text-slate-300 transition-colors">New item</p>
                <p className="text-slate-600 text-xs">Post · Blog · Caption · Image</p>
              </button>

              {filtered.map((item) => (
                <ContentCard key={item.id} item={item} mode="grid" />
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col gap-2">
              {filtered.map((item) => (
                <ContentCard key={item.id} item={item} mode="list" />
              ))}
            </div>
          ) : (
            <CalendarView
              items={items}
              calendarMonth={calendarMonth}
              setCalendarMonth={setCalendarMonth}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              onAddItem={() => setShowModal(true)}
            />
          )}
        </div>
      </div>

      {showModal && (
        <CreateContentModal
          onClose={() => setShowModal(false)}
          onCreated={(item) => { setItems((prev) => [item, ...prev]); setShowModal(false); }}
        />
      )}
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

interface CalendarViewProps {
  items: Draft[];
  calendarMonth: Date;
  setCalendarMonth: (d: Date) => void;
  selectedDay: string | null;
  setSelectedDay: (d: string | null) => void;
  onAddItem: () => void;
}

const TYPE_DOT: Record<ContentType, string> = {
  POST: 'bg-blue-500',
  BLOG: 'bg-purple-500',
  CAPTION: 'bg-yellow-500',
  IMAGE: 'bg-pink-500',
};

const TYPE_CHIP: Record<ContentType, string> = {
  POST: 'bg-blue-950/80 text-blue-400 border border-blue-900/60',
  BLOG: 'bg-purple-950/80 text-purple-400 border border-purple-900/60',
  CAPTION: 'bg-yellow-950/80 text-yellow-500 border border-yellow-900/60',
  IMAGE: 'bg-pink-950/80 text-pink-400 border border-pink-900/60',
};

const TYPE_TIMELINE_BAR: Record<ContentType, string> = {
  POST: 'bg-blue-500',
  BLOG: 'bg-purple-500',
  CAPTION: 'bg-yellow-500',
  IMAGE: 'bg-pink-500',
};

function CalendarView({ items, calendarMonth, setCalendarMonth, selectedDay, setSelectedDay, onAddItem }: CalendarViewProps) {
  const today = toDateKey(new Date());

  // Build items-by-date map (only scheduled + not archived)
  const scheduledItems = items.filter((i) => i.suggestedPostAt && i.status !== 'ARCHIVED');
  const itemsByDate: Record<string, Draft[]> = {};
  for (const item of scheduledItems) {
    const key = toDateKey(new Date(item.suggestedPostAt!));
    if (!itemsByDate[key]) itemsByDate[key] = [];
    itemsByDate[key].push(item);
  }

  // Upcoming items sorted (today and future only)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const upcomingByDate = Object.entries(itemsByDate)
    .filter(([key]) => new Date(key + 'T23:59:59') >= todayStart)
    .sort(([a], [b]) => a.localeCompare(b));

  // Unscheduled items
  const unscheduled = items.filter((i) => !i.suggestedPostAt && i.status !== 'ARCHIVED' && i.status !== 'PUBLISHED');

  const cells = buildCalendarCells(calendarMonth);
  const monthStr = calendarMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' });

  function prevMonth() {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() - 1);
    setCalendarMonth(d);
    setSelectedDay(null);
  }

  function nextMonth() {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() + 1);
    setCalendarMonth(d);
    setSelectedDay(null);
  }

  function goToday() {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    setCalendarMonth(d);
    setSelectedDay(today);
  }

  const selectedItems = selectedDay ? (itemsByDate[selectedDay] ?? []) : null;

  return (
    <div className="flex flex-col xl:flex-row gap-5">

      {/* ── Calendar grid ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9 2L4 7l5 5" />
              </svg>
            </button>
            <h2 className="text-white font-semibold text-base min-w-[160px] text-center">{monthStr}</h2>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M5 2l5 5-5 5" />
              </svg>
            </button>
          </div>
          <button
            onClick={goToday}
            className="text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Day header row */}
        <div className="grid grid-cols-7 mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-600 uppercase tracking-widest py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-px bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-800">
          {cells.map((cell, idx) => {
            const key = toDateKey(cell);
            const isCurrentMonth = cell.getMonth() === calendarMonth.getMonth();
            const isToday = key === today;
            const isSelected = key === selectedDay;
            const dayItems = itemsByDate[key] ?? [];
            const hasItems = dayItems.length > 0;
            const isPast = cell < new Date(today + 'T00:00:00');

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={`relative min-h-[72px] sm:min-h-[84px] p-2 text-left flex flex-col transition-colors group ${
                  isSelected
                    ? 'bg-slate-800'
                    : isToday
                    ? 'bg-blue-950/20 hover:bg-blue-950/30'
                    : 'bg-slate-900 hover:bg-slate-800/60'
                }`}
              >
                {/* Day number */}
                <span className={`text-xs font-semibold leading-none mb-auto ${
                  isToday
                    ? 'text-blue-400'
                    : isSelected
                    ? 'text-white'
                    : isCurrentMonth
                    ? isPast ? 'text-slate-600' : 'text-slate-300'
                    : 'text-slate-700'
                }`}>
                  {isToday ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-[10px] font-bold">
                      {cell.getDate()}
                    </span>
                  ) : (
                    cell.getDate()
                  )}
                </span>

                {/* Content dots + chips */}
                {hasItems && (
                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {dayItems.slice(0, 3).map((item, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[item.contentType]} ${!isCurrentMonth ? 'opacity-40' : ''}`}
                      />
                    ))}
                    {dayItems.length > 3 && (
                      <span className="text-[8px] text-slate-600 leading-none ml-0.5 mt-0.5">
                        +{dayItems.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Item preview chips (visible on larger screens for selected or today) */}
                {hasItems && isCurrentMonth && (isSelected || isToday) && (
                  <div className="hidden sm:flex flex-col gap-0.5 mt-1 w-full">
                    {dayItems.slice(0, 2).map((item, i) => (
                      <span
                        key={i}
                        className={`text-[9px] px-1 py-0.5 rounded truncate max-w-full ${TYPE_CHIP[item.contentType]}`}
                      >
                        {item.title ?? item.finalContent?.slice(0, 18) ?? item.contentType.toLowerCase()}
                      </span>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="text-[9px] text-slate-600">+{dayItems.length - 2} more</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {(['POST', 'BLOG', 'CAPTION', 'IMAGE'] as ContentType[]).map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${TYPE_DOT[t]}`} />
              <span className="text-slate-600 text-[10px]">{t.charAt(0) + t.slice(1).toLowerCase()}</span>
            </div>
          ))}
          <span className="text-slate-700 text-[10px] ml-auto">
            {scheduledItems.length} scheduled · {unscheduled.length} unscheduled
          </span>
        </div>
      </div>

      {/* ── Right panel: selected day or upcoming timeline ──────────────── */}
      <div className="xl:w-80 shrink-0 space-y-4">

        {/* Selected day panel */}
        {selectedDay && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-semibold">{relativeDayLabel(selectedDay)}</p>
                {selectedDay !== today && (
                  <p className="text-slate-500 text-xs">{new Date(selectedDay + 'T12:00:00').toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-slate-600 hover:text-slate-400 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
                </svg>
              </button>
            </div>

            {selectedItems && selectedItems.length > 0 ? (
              <div className="divide-y divide-slate-800/60">
                {selectedItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/content-bank/${item.id}`}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-800/40 transition-colors group"
                  >
                    <div className={`w-0.5 h-full rounded-full ${TYPE_TIMELINE_BAR[item.contentType]} shrink-0 self-stretch mt-1 min-h-[32px]`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${TYPE_CHIP[item.contentType]}`}>
                          {item.contentType}
                        </span>
                        {item.suggestedPostAt && (
                          <span className="text-slate-600 text-[10px]">
                            {new Date(item.suggestedPostAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-200 text-xs line-clamp-2 leading-relaxed">
                        {item.title ?? item.finalContent ?? <span className="italic text-slate-600">No content yet</span>}
                      </p>
                    </div>
                    <span className="text-slate-700 group-hover:text-slate-500 text-sm transition-colors shrink-0">→</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-slate-600 text-sm mb-3">Nothing scheduled for this day</p>
                <button
                  onClick={onAddItem}
                  className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  + Add content
                </button>
              </div>
            )}
          </div>
        )}

        {/* Upcoming timeline */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h3 className="text-white text-sm font-semibold">Upcoming</h3>
            <p className="text-slate-500 text-xs mt-0.5">Scheduled content</p>
          </div>

          {upcomingByDate.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-slate-600 text-sm mb-3">No upcoming content scheduled</p>
              <button
                onClick={onAddItem}
                className="text-xs px-3 py-1.5 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 rounded-lg transition-colors"
              >
                Schedule something →
              </button>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {upcomingByDate.slice(0, 10).map(([dateKey, dayItems]) => (
                <div key={dateKey}>
                  {/* Date group header */}
                  <div className="px-4 py-2 flex items-center gap-2 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                    <span className={`text-xs font-semibold ${dateKey === today ? 'text-blue-400' : 'text-slate-400'}`}>
                      {relativeDayLabel(dateKey)}
                    </span>
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-[10px] text-slate-600">{dayItems.length}</span>
                  </div>

                  {/* Items for this day */}
                  <div className="px-4 pb-2 space-y-2">
                    {dayItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/content-bank/${item.id}`}
                        className="flex items-start gap-2.5 group"
                      >
                        {/* Timeline dot + line */}
                        <div className="flex flex-col items-center shrink-0 pt-1">
                          <span className={`w-2 h-2 rounded-full ${TYPE_DOT[item.contentType]} ring-2 ring-slate-900`} />
                        </div>

                        <div className={`flex-1 rounded-xl border p-2.5 transition-colors group-hover:border-slate-600 ${
                          item.status === 'PUBLISHED'
                            ? 'border-green-900/40 bg-green-950/10'
                            : 'border-slate-800 bg-slate-800/30'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${TYPE_CHIP[item.contentType]}`}>
                              {item.contentType}
                            </span>
                            {item.suggestedPostAt && (
                              <span className="text-slate-600 text-[10px] ml-auto">
                                {new Date(item.suggestedPostAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 text-xs line-clamp-1 leading-relaxed">
                            {item.title ?? item.finalContent?.slice(0, 60) ?? <span className="italic text-slate-600">No content</span>}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {upcomingByDate.length > 10 && (
                <p className="text-center text-slate-600 text-xs py-3">
                  +{upcomingByDate.length - 10} more days…
                </p>
              )}
            </div>
          )}
        </div>

        {/* Unscheduled items */}
        {unscheduled.length > 0 && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-white text-sm font-semibold">No date set</h3>
                <p className="text-slate-500 text-xs mt-0.5">{unscheduled.length} item{unscheduled.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-[200px] overflow-y-auto">
              {unscheduled.map((item) => (
                <Link
                  key={item.id}
                  href={`/content-bank/${item.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors group"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[item.contentType]} opacity-60`} />
                  <p className="flex-1 text-slate-400 text-xs line-clamp-1">
                    {item.title ?? item.finalContent ?? <span className="italic text-slate-600">Empty {item.contentType.toLowerCase()}</span>}
                  </p>
                  <span className="text-slate-700 group-hover:text-slate-500 text-sm transition-colors shrink-0">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Content Card ─────────────────────────────────────────────────────────────

function ContentCard({ item, mode }: { item: Draft; mode: 'grid' | 'list' }) {
  const cfg = TYPE_CONFIG[item.contentType];

  function handleQuickCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (item.finalContent) navigator.clipboard.writeText(item.finalContent);
  }

  if (mode === 'list') {
    return (
      <Link
        href={`/content-bank/${item.id}`}
        className={`group relative bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 px-5 py-4 flex items-center gap-4 transition-all duration-150 overflow-hidden`}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${cfg.dot}`} />
        {item.contentType === 'IMAGE' && item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-800 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium line-clamp-1">
            {item.title ?? item.finalContent ?? <span className="text-slate-600 italic">No content yet</span>}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            {item.contentType.charAt(0) + item.contentType.slice(1).toLowerCase()}
            {item.suggestedPostAt && item.status !== 'PUBLISHED' && (
              <span className="text-blue-400"> · 📅 {formatShortDate(item.suggestedPostAt)}</span>
            )}
            {item.status === 'PUBLISHED' && (
              <span className="text-green-400"> · ✓ Posted</span>
            )}
          </p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${cfg.badge}`}>
          {item.contentType}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[item.status]}`}>
          {item.status}
        </span>
        <span className="text-slate-600 group-hover:text-slate-400 text-sm transition-colors shrink-0">→</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/content-bank/${item.id}`}
      className={`group relative bg-slate-900 rounded-2xl border border-slate-800 ${cfg.hoverBorder} overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 flex flex-col`}
    >
      {/* Top accent band */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cfg.accent}`} />

      {/* Image section */}
      {item.contentType === 'IMAGE' && item.imageUrl && (
        <div className="relative h-40 overflow-hidden bg-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt="Content" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-sm font-medium">View →</span>
          </div>
        </div>
      )}

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3 flex-1 mt-0.5">
        {/* Type + status row */}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.badge}`}>
            {item.contentType}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto ${STATUS_BADGE[item.status]}`}>
            {item.status}
          </span>
        </div>

        {/* Content preview */}
        <div className="min-h-[52px] flex flex-col justify-center">
          {item.title && (
            <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{item.title}</p>
          )}
          {!item.title && item.finalContent && (
            <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">{item.finalContent}</p>
          )}
          {!item.title && !item.finalContent && item.contentType !== 'IMAGE' && (
            <p className="text-slate-600 text-sm italic">No content yet</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-auto">
          <span className="text-xs">
            {item.status === 'PUBLISHED' && item.postedAt ? (
              <span className="text-green-400">✓ {timeAgo(item.postedAt)}</span>
            ) : item.suggestedPostAt ? (
              <span className="text-blue-400">📅 {formatShortDate(item.suggestedPostAt)}</span>
            ) : (
              <span className="text-slate-600">{timeAgo(item.updatedAt)}</span>
            )}
          </span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.finalContent && (
              <button
                onClick={handleQuickCopy}
                className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors"
              >
                Copy
              </button>
            )}
            <span className="text-slate-500 text-sm">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Create Content Modal ─────────────────────────────────────────────────────

interface CreateContentModalProps {
  onClose: () => void;
  onCreated: (item: Draft) => void;
}

function CreateContentModal({ onClose, onCreated }: CreateContentModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [contentType, setContentType] = useState<ContentType>('POST');

  // Step 2 fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [suggestedPostAt, setSuggestedPostAt] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = charLimitForType(contentType);
  const nearLimit = isFinite(limit) && content.length > limit * 0.9;
  const overLimit = isFinite(limit) && content.length > limit;

  function pickType(t: ContentType) {
    setContentType(t);
    setStep(2);
  }

  async function handleFile(file: File) {
    setUploading(true);
    setImagePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api.upload<{ imageUrl: string }>('/images/upload', fd);
      setImageUrl(result.imageUrl);
      setImagePreview(result.imageUrl);
    } catch {
      setError('Upload failed. Please try again.');
      setImagePreview('');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const item = await api.post<Draft>('/content-bank', {
        contentType,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
        imageUrl: imageUrl || undefined,
        suggestedPostAt: suggestedPostAt ? new Date(suggestedPostAt).toISOString() : undefined,
      });
      onCreated(item);
    } catch {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  const typeList: Array<ContentType> = ['POST', 'BLOG', 'CAPTION', 'IMAGE'];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-slate-900 rounded-2xl border border-slate-800 w-full shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto transition-all duration-300 ${step === 1 ? 'max-w-md' : 'max-w-lg'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          {step === 1 ? (
            <h2 className="text-white font-semibold">New content</h2>
          ) : (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9 2L4 7l5 5" />
              </svg>
              {contentType.charAt(0) + contentType.slice(1).toLowerCase()}
            </button>
          )}
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Step indicator */}
        {step === 2 && (
          <div className="px-6 pt-3 pb-0 flex items-center gap-2">
            <span className="text-slate-600 text-xs">Step 2 of 2</span>
            <div className="h-0.5 bg-slate-800 flex-1 rounded-full overflow-hidden">
              <div className="h-full w-full bg-blue-500 rounded-full" />
            </div>
          </div>
        )}

        {/* Step 1: Type picker */}
        {step === 1 && (
          <div className="p-6">
            <p className="text-slate-500 text-sm mb-4">What kind of content are you adding?</p>
            <div className="grid grid-cols-2 gap-3">
              {typeList.map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => pickType(t)}
                    className="group text-left bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-slate-600 hover:bg-slate-800 transition-all duration-150"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border ${cfg.badge}`}>
                        {cfg.icon}
                      </span>
                      <span className="text-slate-700 group-hover:text-slate-500 text-sm transition-colors">→</span>
                    </div>
                    <p className="text-white font-semibold text-sm">{t.charAt(0) + t.slice(1).toLowerCase()}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{cfg.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Content form */}
        {step === 2 && (
          <div className="p-6 space-y-5">

            {/* Title — BLOG only */}
            {contentType === 'BLOG' && (
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article title…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}

            {/* Text content */}
            {contentType !== 'IMAGE' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 text-sm font-medium">Content</label>
                  {isFinite(limit) && (
                    <span className={`text-xs ${overLimit ? 'text-red-400' : nearLimit ? 'text-yellow-400' : 'text-slate-500'}`}>
                      {content.length.toLocaleString()} / {limit.toLocaleString()}
                    </span>
                  )}
                  {!isFinite(limit) && content.length > 0 && (
                    <span className="text-slate-500 text-xs">{content.length.toLocaleString()} chars</span>
                  )}
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    contentType === 'CAPTION' ? 'Write your caption…'
                    : contentType === 'BLOG' ? 'Paste your article…'
                    : 'Write your post…'
                  }
                  rows={contentType === 'BLOG' ? 10 : contentType === 'CAPTION' ? 4 : 5}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            )}

            {/* Image drop zone */}
            {(contentType === 'IMAGE' || contentType === 'CAPTION') && (
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1.5">
                  {contentType === 'IMAGE' ? 'Image *' : 'Image'}
                  {contentType === 'CAPTION' && <span className="text-slate-500 ml-1">(optional)</span>}
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  className="hidden"
                />

                {!imagePreview ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                      isDragging ? 'border-blue-500 bg-blue-950/20' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/40'
                    }`}
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-600">
                      <path d="M20 21l-4-4-4 4" /><path d="M16 17V28" />
                      <path d="M27.3 24.6A6 6 0 0024 13h-1.3A10 10 0 104 22.3" />
                    </svg>
                    <p className="text-slate-400 text-sm">{isDragging ? 'Drop to upload' : 'Drop image here'}</p>
                    <p className="text-slate-600 text-xs">or click to browse · JPEG, PNG, GIF, WebP</p>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                    {uploading ? (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-end p-3 gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs px-2.5 py-1 bg-slate-900/80 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => { setImageUrl(''); setImagePreview(''); }}
                          className="text-xs px-2.5 py-1 bg-red-900/60 text-red-400 rounded-lg hover:bg-red-900/80 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Schedule */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-2">
                Schedule for <span className="text-slate-500">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {schedulePresets().map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setSuggestedPostAt(p.value); setActivePreset(p.label); }}
                    className={`text-xs py-2 px-2 rounded-lg border transition-colors text-center ${
                      activePreset === p.label
                        ? 'border-blue-500/50 bg-blue-950/30 text-blue-400'
                        : 'bg-slate-800 border-slate-700/40 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="datetime-local"
                value={suggestedPostAt}
                onChange={(e) => { setSuggestedPostAt(e.target.value); setActivePreset(null); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-950/20 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-700 text-slate-400 text-sm rounded-xl hover:border-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || uploading || (contentType === 'IMAGE' && !imageUrl)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : 'Add to bank'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
