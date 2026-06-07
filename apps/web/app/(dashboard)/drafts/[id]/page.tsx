'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import type { Draft, DraftStatus } from '@synapse/types';

const STATUSES: DraftStatus[] = ['DRAFT', 'REFINED', 'APPROVED', 'PUBLISHED'];

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

  useEffect(() => {
    api.get<Draft>(`/drafts/${id}`).then((d) => {
      setDraft(d);
      setContent(d.finalContent ?? d.variations.find((v) => v.selected)?.content ?? d.variations[0]?.content ?? '');
      setScheduledAt(d.suggestedPostAt ? toDatetimeLocal(d.suggestedPostAt) : '');
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSelectVariation(variationId: string) {
    const updated = await api.patch<Draft>(`/drafts/${id}/select-variation/${variationId}`);
    setDraft(updated);
    setContent(updated.finalContent ?? '');
  }

  async function handleSave() {
    setSaving(true);
    const updated = await api.patch<Draft>(`/drafts/${id}`, { finalContent: content });
    setDraft(updated);
    setEditing(false);
    setSaving(false);
  }

  async function handleStatusChange(status: DraftStatus) {
    const payload: Record<string, unknown> = { status };
    if (status === 'PUBLISHED') payload.postedAt = new Date().toISOString();
    const updated = await api.patch<Draft>(`/drafts/${id}`, payload);
    setDraft(updated);
  }

  async function handleSchedule() {
    if (!scheduledAt) return;
    const updated = await api.patch<Draft>(`/drafts/${id}`, { suggestedPostAt: new Date(scheduledAt).toISOString() });
    setDraft(updated);
  }

  async function handleClearSchedule() {
    const updated = await api.patch<Draft>(`/drafts/${id}`, { suggestedPostAt: null });
    setDraft(updated);
    setScheduledAt('');
  }

  async function handleArchive() {
    await api.delete(`/drafts/${id}`);
    router.push('/drafts');
  }

  function handleCopy() {
    navigator.clipboard.writeText(content);
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!draft) return <div className="p-8 text-slate-400">Draft not found</div>;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white text-sm">← Back</button>
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                draft.status === s
                  ? s === 'PUBLISHED'
                    ? 'border-green-500 bg-green-600/20 text-green-400'
                    : 'border-blue-500 bg-blue-600/20 text-blue-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {s === 'PUBLISHED' ? '✓ Mark as posted' : s}
            </button>
          ))}
          <button onClick={handleArchive} className="text-xs px-3 py-1.5 border border-red-900 text-red-400 rounded-lg hover:bg-red-900/20 transition-colors">
            Archive
          </button>
        </div>
      </div>

      {draft.status === 'PUBLISHED' && draft.postedAt && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl px-5 py-3 flex items-center gap-2">
          <span className="text-green-400 text-sm font-medium">✓ Posted on LinkedIn</span>
          <span className="text-green-600 text-xs">
            {new Date(draft.postedAt).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      )}

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Final content</h2>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="text-xs px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg hover:border-slate-600 transition-colors">
              Copy
            </button>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors">
                Edit
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
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
            />
          ) : (
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          )}
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <h3 className="text-white font-semibold mb-1">Schedule for</h3>
        <p className="text-slate-500 text-xs mb-3">Set a reminder date so you know when to post this on LinkedIn.</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleSchedule}
            disabled={!scheduledAt}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            Save
          </button>
          {draft.suggestedPostAt && (
            <button onClick={handleClearSchedule} className="text-slate-500 hover:text-red-400 text-sm transition-colors whitespace-nowrap">
              Clear
            </button>
          )}
        </div>
        {draft.suggestedPostAt && (
          <p className="text-green-400 text-xs mt-2">
            Scheduled for {new Date(draft.suggestedPostAt).toLocaleDateString('en', {
              weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {draft.variations.length > 0 && (
        <div>
          <h3 className="text-slate-400 text-sm font-medium mb-3">All variations</h3>
          <div className="space-y-2">
            {draft.variations.map((v) => (
              <div
                key={v.id}
                onClick={() => handleSelectVariation(v.id)}
                className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                  v.selected ? 'border-blue-500 bg-blue-900/10' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
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
