'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import type { Draft, DraftStatus, ContentType } from '@synapse/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

// ─── Design tokens ────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<ContentType, string> = {
  POST: 'bg-blue-950 text-blue-400 border border-blue-900/60',
  BLOG: 'bg-purple-950 text-purple-400 border border-purple-900/60',
  CAPTION: 'bg-yellow-950 text-yellow-500 border border-yellow-900/60',
  IMAGE: 'bg-pink-950 text-pink-400 border border-pink-900/60',
};

const STATUS_STEPS: Array<{
  value: DraftStatus;
  label: string;
  dot: string;
  active: string;
}> = [
  { value: 'DRAFT',    label: 'Draft',    dot: 'bg-slate-500',  active: 'border-slate-600/60 bg-slate-900/60 text-slate-400' },
  { value: 'REFINED',  label: 'Refined',  dot: 'bg-yellow-500', active: 'border-yellow-700/60 bg-yellow-950/50 text-yellow-400' },
  { value: 'APPROVED', label: 'Approved', dot: 'bg-green-500',  active: 'border-green-700/60 bg-green-950/50 text-green-400' },
  { value: 'PUBLISHED',label: 'Published',dot: 'bg-blue-500',   active: 'border-blue-700/60 bg-blue-950/50 text-blue-400' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentBankDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [titleEdit, setTitleEdit] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Draft>(`/content-bank/${id}`).then((d) => {
      setItem(d);
      setContent(d.finalContent ?? '');
      setTitleEdit(d.title ?? '');
      setScheduledAt(d.suggestedPostAt ? toDatetimeLocal(d.suggestedPostAt) : '');
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    const updated = await api.patch<Draft>(`/content-bank/${id}`, {
      content,
      title: titleEdit.trim() || undefined,
    });
    setItem(updated);
    setEditing(false);
    setSaving(false);
  }

  async function handleStatusChange(status: DraftStatus) {
    const payload: Record<string, unknown> = { status };
    if (status === 'PUBLISHED') payload.postedAt = new Date().toISOString();
    const updated = await api.patch<Draft>(`/content-bank/${id}`, payload);
    setItem(updated);
  }

  async function handleSchedule() {
    if (!scheduledAt) return;
    const updated = await api.patch<Draft>(`/content-bank/${id}`, {
      suggestedPostAt: new Date(scheduledAt).toISOString(),
    });
    setItem(updated);
    setActivePreset(null);
  }

  async function handleClearSchedule() {
    const updated = await api.patch<Draft>(`/content-bank/${id}`, { suggestedPostAt: null });
    setItem(updated);
    setScheduledAt('');
    setActivePreset(null);
  }

  async function handleReplaceImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api.upload<{ imageUrl: string }>('/images/upload', fd);
      const updated = await api.patch<Draft>(`/content-bank/${id}`, { imageUrl: result.imageUrl });
      setItem(updated);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  }

  async function handleArchive() {
    if (!confirm('Archive this item?')) return;
    await api.delete(`/content-bank/${id}`);
    router.push('/content-bank');
  }

  function handleCopy() {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1500);
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full animate-pulse">
        <div className="px-6 py-4 border-b border-slate-800 h-14 bg-slate-900/40" />
        <div className="flex-1 flex">
          <div className="flex-1 p-6 space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-900 rounded-2xl border border-slate-800" />)}
          </div>
          <div className="hidden lg:block w-80 border-l border-slate-800 p-5 space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-900 rounded-xl border border-slate-800" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!item) return <div className="p-8 text-slate-400">Not found</div>;

  const isImage = item.contentType === 'IMAGE';
  const isBlog = item.contentType === 'BLOG';
  const limit = charLimitForType(item.contentType);
  const nearLimit = isFinite(limit) && content.length > limit * 0.9;
  const overLimit = isFinite(limit) && content.length > limit;
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.value === item.status);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Sticky header bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 backdrop-blur-sm bg-slate-950/80 border-b border-slate-800 px-5 py-3 flex flex-wrap items-center gap-3 shrink-0">

        {/* Left: back + type */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-slate-500 hover:text-white text-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M9 2L4 7l5 5" />
            </svg>
            Back
          </button>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${TYPE_BADGE[item.contentType]}`}>
            {item.contentType}
          </span>
        </div>

        {/* Right: status pipeline + archive */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {STATUS_STEPS.map((step, idx) => {
            const isPast = idx <= currentStepIdx;
            return (
              <button
                key={step.value}
                onClick={() => handleStatusChange(step.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all duration-150 ${
                  isPast
                    ? step.active
                    : 'border-slate-800 text-slate-600 hover:text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPast ? step.dot : 'bg-slate-700'}`} />
                {step.label}
              </button>
            );
          })}

          <div className="w-px h-4 bg-slate-800 mx-1" />

          <button
            onClick={handleArchive}
            className="text-xs px-2.5 py-1.5 border border-red-900/50 text-red-500 hover:bg-red-950/30 rounded-lg transition-colors"
          >
            Archive
          </button>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

        {/* ── LEFT: Content editor ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-y-auto px-5 py-6 space-y-5">

          {/* Published banner */}
          {item.status === 'PUBLISHED' && item.postedAt && (
            <div className="bg-green-950/30 border border-green-900/40 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-green-400 text-sm font-semibold">✓ Published</span>
              <span className="text-green-600 text-xs">
                {new Date(item.postedAt).toLocaleDateString('en', {
                  weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </span>
            </div>
          )}

          {/* Image card (IMAGE type) */}
          {isImage && item.imageUrl && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Image</span>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReplaceImage} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {uploading ? 'Uploading…' : 'Replace'}
                  </button>
                </div>
              </div>
              <div className="p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt="Content" className="w-full rounded-xl object-cover max-h-[500px]" />
              </div>
            </div>
          )}

          {/* Text content card */}
          {!isImage && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center gap-3">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Content</span>

                {editing && isFinite(limit) && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    overLimit ? 'bg-red-950 text-red-400' : nearLimit ? 'bg-yellow-950 text-yellow-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {content.length.toLocaleString()} / {limit.toLocaleString()}
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {!editing && (
                    <button
                      onClick={handleCopy}
                      className={`text-xs px-3 py-1.5 border rounded-lg transition-all duration-150 ${
                        copySuccess
                          ? 'border-green-700/60 bg-green-950/30 text-green-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      {copySuccess ? '✓ Copied!' : 'Copy'}
                    </button>
                  )}
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="text-xs px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg hover:border-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-3">
                {isBlog && (
                  editing ? (
                    <input
                      value={titleEdit}
                      onChange={(e) => setTitleEdit(e.target.value)}
                      placeholder="Article title…"
                      className="w-full bg-transparent text-white font-bold text-xl focus:outline-none border-b border-slate-700 pb-3 mb-1"
                    />
                  ) : item.title ? (
                    <p className="text-white font-bold text-xl">{item.title}</p>
                  ) : null
                )}

                {editing ? (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={isBlog ? 20 : 12}
                    className="w-full bg-transparent text-slate-200 text-sm leading-relaxed resize-none focus:outline-none"
                  />
                ) : (
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap min-h-[120px]">
                    {content || <span className="text-slate-600 italic">No content yet — click Edit to add</span>}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Attached image (non-IMAGE types) */}
          {!isImage && (
            <>
              <input ref={attachInputRef} type="file" accept="image/*" onChange={handleReplaceImage} className="hidden" />
              {item.imageUrl ? (
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="relative h-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt="Attached" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-end p-3 gap-2">
                      <button
                        onClick={() => attachInputRef.current?.click()}
                        disabled={uploading}
                        className="text-xs px-2.5 py-1 bg-slate-900/80 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        {uploading ? 'Uploading…' : 'Replace'}
                      </button>
                      <button
                        onClick={async () => { const u = await api.patch<Draft>(`/content-bank/${id}`, { imageUrl: null }); setItem(u); }}
                        className="text-xs px-2.5 py-1 bg-red-900/60 text-red-400 rounded-lg hover:bg-red-900/80 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => attachInputRef.current?.click()}
                  className="w-full bg-slate-900 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 px-4 py-3 text-left flex items-center gap-3 transition-colors group"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-600 shrink-0">
                    <rect x="1" y="3" width="14" height="10" rx="1.5" /><path d="M1 10l3.5-3.5 3 3 2.5-2.5 4 4" /><circle cx="11.5" cy="6" r="1" />
                  </svg>
                  <div>
                    <p className="text-slate-500 text-sm group-hover:text-slate-400 transition-colors">Attach an image</p>
                    <p className="text-slate-600 text-xs">Optional — adds a visual to this content</p>
                  </div>
                  <span className="text-slate-700 text-sm ml-auto">+</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: Metadata sidebar ──────────────────────────────────────── */}
        <div className="shrink-0 lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 overflow-y-auto px-5 py-6 space-y-4">

          {/* Status card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3">Status</p>
            <div className="space-y-0.5">
              {STATUS_STEPS.map((step, idx) => {
                const isPast = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.value}>
                    <button
                      onClick={() => handleStatusChange(step.value)}
                      className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isPast ? step.dot : 'bg-slate-700'}`} />
                      <span className={`text-sm flex-1 text-left ${isCurrent ? 'text-white font-medium' : isPast ? 'text-slate-400' : 'text-slate-600'}`}>
                        {step.label}
                      </span>
                      {isCurrent && <span className={`text-xs ${STATUS_STEPS[currentStepIdx].dot.replace('bg-', 'text-')}`}>✓</span>}
                      {!isCurrent && !isPast && (
                        <span className="text-slate-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      )}
                    </button>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className="w-px h-3 bg-slate-800 ml-[0.6rem]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metadata card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3">Details</p>
            <div className="space-y-0">
              {[
                {
                  label: 'Type',
                  value: (
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${TYPE_BADGE[item.contentType]}`}>
                      {item.contentType}
                    </span>
                  ),
                },
                {
                  label: 'Created',
                  value: new Date(item.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }),
                },
                {
                  label: 'Updated',
                  value: timeAgo(item.updatedAt),
                },
                {
                  label: 'Chars',
                  value: isImage ? '—' : `${content.length.toLocaleString()}${isFinite(limit) ? ` / ${limit.toLocaleString()}` : ''}`,
                },
              ].map((row, i, arr) => (
                <div key={row.label} className={`flex items-center justify-between py-2 ${i < arr.length - 1 ? 'border-b border-slate-800/60' : ''}`}>
                  <span className="text-slate-500 text-xs">{row.label}</span>
                  <span className="text-white text-xs text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider font-medium mb-3">Schedule</p>

            {item.suggestedPostAt ? (
              <>
                <div className="flex items-center gap-2 mb-3 p-2.5 bg-blue-950/30 border border-blue-900/40 rounded-lg">
                  <span className="text-base">📅</span>
                  <span className="text-blue-400 text-xs font-medium">
                    {new Date(item.suggestedPostAt).toLocaleDateString('en', {
                      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setScheduledAt(toDatetimeLocal(item.suggestedPostAt!)); }}
                    className="flex-1 py-1.5 border border-slate-700 text-slate-400 text-xs rounded-lg hover:border-slate-600 hover:text-white transition-colors"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleClearSchedule}
                    className="text-xs text-slate-600 hover:text-red-400 px-2 py-1.5 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {schedulePresets().map((p) => (
                    <button
                      key={p.label}
                      onClick={() => { setScheduledAt(p.value); setActivePreset(p.label); }}
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
                  value={scheduledAt}
                  onChange={(e) => { setScheduledAt(e.target.value); setActivePreset(null); }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors mb-2"
                />

                <button
                  onClick={handleSchedule}
                  disabled={!scheduledAt}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Save schedule
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
