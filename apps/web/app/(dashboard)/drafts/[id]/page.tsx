'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import type { Draft } from '@synapse/types';

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [cancellingSchedule, setCancellingSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Draft>(`/drafts/${id}`).then((d) => {
      setDraft(d);
      setContent(d.finalContent ?? d.variations.find((v) => v.selected)?.content ?? d.variations[0]?.content ?? '');
      // Use scheduledAt (Bull queue) if set, otherwise fall back to suggestedPostAt
      const queuedAt = (d as any).scheduledAt;
      if (queuedAt) setScheduledAt(toDatetimeLocal(queuedAt));
      else if (d.suggestedPostAt) setScheduledAt(toDatetimeLocal(d.suggestedPostAt));
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSelectVariation(variationId: string) {
    const updated = await api.patch<Draft>(`/drafts/${id}/select-variation/${variationId}`);
    setDraft(updated);
    setContent(updated.finalContent ?? '');
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<Draft>(`/drafts/${id}`, { finalContent: content });
      setDraft(updated);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!confirm('Publish this post to LinkedIn now?')) return;
    setPublishing(true);
    setError(null);
    try {
      const updated = await api.post<Draft>(`/drafts/${id}/publish`);
      setDraft(updated);
    } catch (e: any) {
      setError(e?.message ?? 'Publishing failed. Check that your LinkedIn account is connected and the token has not expired.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleScheduleQueue() {
    if (!scheduledAt) return;
    setScheduling(true);
    setError(null);
    try {
      const updated = await api.post<Draft>(`/drafts/${id}/schedule`, {
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      setDraft(updated);
    } catch (e: any) {
      setError(e?.message ?? 'Scheduling failed');
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelSchedule() {
    setCancellingSchedule(true);
    setError(null);
    try {
      const updated = await api.delete<Draft>(`/drafts/${id}/schedule`);
      setDraft(updated);
      setScheduledAt('');
    } catch (e: any) {
      setError(e?.message ?? 'Could not cancel schedule');
    } finally {
      setCancellingSchedule(false);
    }
  }

  async function handleArchive() {
    if (!confirm('Archive this draft?')) return;
    await api.delete(`/drafts/${id}`);
    router.push('/drafts');
  }

  function handleCopy() {
    navigator.clipboard.writeText(content);
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!draft) return <div className="p-8 text-slate-400">Draft not found</div>;

  const isPublished = draft.status === 'PUBLISHED';
  const isScheduled = !!(draft as any).scheduledAt;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white text-sm">← Back</button>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Status pills — read-only display */}
          {(['DRAFT', 'REFINED', 'APPROVED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => api.patch<Draft>(`/drafts/${id}`, { status: s }).then(setDraft)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                draft.status === s
                  ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {s}
            </button>
          ))}

          {/* LinkedIn publish — the real action */}
          {!isPublished && (
            <button
              onClick={handlePublish}
              disabled={publishing || !content.trim()}
              className="text-xs px-4 py-1.5 rounded-lg border border-blue-600 bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {publishing ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Publishing…
                </>
              ) : '↗ Publish to LinkedIn'}
            </button>
          )}

          <button onClick={handleArchive} className="text-xs px-3 py-1.5 border border-red-900 text-red-400 rounded-lg hover:bg-red-900/20 transition-colors">
            Archive
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl px-5 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Published confirmation */}
      {isPublished && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-green-400 text-sm font-medium">✓ Published to LinkedIn</span>
          {draft.postedAt && (
            <span className="text-green-600 text-xs">
              {new Date(draft.postedAt).toLocaleDateString('en', {
                weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </span>
          )}
          {(draft as any).linkedinPostId && (
            <span className="text-green-700 text-xs ml-auto font-mono">{(draft as any).linkedinPostId}</span>
          )}
        </div>
      )}

      {/* Scheduled confirmation */}
      {isScheduled && !isPublished && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl px-5 py-3 flex items-center justify-between gap-3">
          <div>
            <span className="text-blue-400 text-sm font-medium">📅 Queued for auto-publish</span>
            <span className="text-blue-600 text-xs ml-3">
              {new Date((draft as any).scheduledAt).toLocaleDateString('en', {
                weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </span>
          </div>
          <button
            onClick={handleCancelSchedule}
            disabled={cancellingSchedule}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            {cancellingSchedule ? 'Cancelling…' : 'Cancel'}
          </button>
        </div>
      )}

      {/* Content editor */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Content</h2>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="text-xs px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg hover:border-slate-600 transition-colors">
              Copy
            </button>
            {!editing ? (
              <button onClick={() => setEditing(true)} disabled={isPublished} className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors">
                Edit
              </button>
            ) : (
              <>
                <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg hover:border-slate-600 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="p-5">
          {editing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full bg-transparent text-slate-200 text-sm leading-relaxed resize-none focus:outline-none"
              placeholder="Write your post content…"
            />
          ) : (
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {content || <span className="text-slate-600">No content yet — select a variation or edit</span>}
            </p>
          )}
        </div>
      </div>

      {/* Schedule for auto-publish via Bull queue */}
      {!isPublished && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <h3 className="text-white font-semibold mb-1">Schedule auto-publish</h3>
          <p className="text-slate-500 text-xs mb-3">
            Set a time and SYNAPSE will publish directly to LinkedIn at that moment — no action needed from you.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={toDatetimeLocal(new Date().toISOString())}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleScheduleQueue}
              disabled={!scheduledAt || scheduling}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
            >
              {scheduling ? 'Scheduling…' : isScheduled ? 'Update schedule' : 'Schedule'}
            </button>
          </div>
          <p className="text-slate-600 text-xs mt-2">LinkedIn token must be valid at publish time.</p>
        </div>
      )}

      {/* Variations */}
      {draft.variations.length > 0 && (
        <div>
          <h3 className="text-slate-400 text-sm font-medium mb-3">Variations</h3>
          <div className="space-y-2">
            {draft.variations.map((v) => (
              <div
                key={v.id}
                onClick={() => !isPublished && handleSelectVariation(v.id)}
                className={`rounded-xl border p-4 transition-colors ${
                  isPublished ? 'cursor-default' : 'cursor-pointer'
                } ${
                  v.selected
                    ? 'border-blue-500 bg-blue-900/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">{v.label}</span>
                  {v.selected && <span className="text-xs text-blue-400">Active ✓</span>}
                </div>
                <p className="text-slate-300 text-sm line-clamp-3">{v.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
