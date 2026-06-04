'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api-client';
import type { Draft, DraftStatus } from '@synapse/types';

const STATUSES: DraftStatus[] = ['DRAFT', 'REFINED', 'APPROVED', 'PUBLISHED'];

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ContentBankDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [titleEdit, setTitleEdit] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      title: titleEdit || undefined,
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
  }

  async function handleClearSchedule() {
    const updated = await api.patch<Draft>(`/content-bank/${id}`, { suggestedPostAt: null });
    setItem(updated);
    setScheduledAt('');
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
    }
  }

  async function handleArchive() {
    await api.delete(`/content-bank/${id}`);
    router.push('/content-bank');
  }

  function handleCopy() {
    navigator.clipboard.writeText(content);
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!item) return <div className="p-8 text-slate-400">Not found</div>;

  const isImage = item.contentType === 'IMAGE';
  const isBlog = item.contentType === 'BLOG';

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
                item.status === s
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

      {/* Published banner */}
      {item.status === 'PUBLISHED' && item.postedAt && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl px-5 py-3 flex items-center gap-2">
          <span className="text-green-400 text-sm font-medium">✓ Posted</span>
          <span className="text-green-600 text-xs">
            {new Date(item.postedAt).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Image preview */}
      {isImage && item.imageUrl && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">Image</h2>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReplaceImage} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                {uploading ? 'Uploading…' : 'Replace image'}
              </button>
            </div>
          </div>
          <div className="p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt="Content" className="w-full rounded-xl object-cover max-h-48 sm:max-h-96" />
          </div>
        </div>
      )}

      {/* Text content */}
      {!isImage && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">Content</h2>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="text-xs px-3 py-1.5 border border-slate-700 text-slate-400 rounded-lg hover:border-slate-600 transition-colors">
                Copy
              </button>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors">
                  Edit
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
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
                  className="w-full bg-transparent text-white font-bold text-lg focus:outline-none border-b border-slate-700 pb-2"
                />
              ) : (
                item.title && <p className="text-white font-bold text-lg">{item.title}</p>
              )
            )}
            {editing ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={isBlog ? 20 : 12}
                className="w-full bg-transparent text-slate-200 text-sm leading-relaxed resize-none focus:outline-none"
              />
            ) : (
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
            )}
          </div>
        </div>
      )}

      {/* Image attachment for non-image content types */}
      {!isImage && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <h3 className="text-white font-semibold mb-1">Attached image</h3>
          {item.imageUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt="Attached" className="rounded-xl w-full max-h-48 object-cover" />
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReplaceImage} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-xs text-slate-400 hover:text-white transition-colors">
                  {uploading ? 'Uploading…' : 'Replace'}
                </button>
                <button onClick={async () => { const u = await api.patch<Draft>(`/content-bank/${id}`, { imageUrl: null }); setItem(u); }} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-slate-500 text-xs mb-2">No image attached</p>
              <input type="file" accept="image/*" onChange={handleReplaceImage} disabled={uploading}
                className="text-sm text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Schedule */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <h3 className="text-white font-semibold mb-1">Schedule for</h3>
        <p className="text-slate-500 text-xs mb-3">Set a reminder date so you know when to post this.</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button onClick={handleSchedule} disabled={!scheduledAt} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
            Save
          </button>
          {item.suggestedPostAt && (
            <button onClick={handleClearSchedule} className="text-slate-500 hover:text-red-400 text-sm transition-colors whitespace-nowrap">
              Clear
            </button>
          )}
        </div>
        {item.suggestedPostAt && (
          <p className="text-green-400 text-xs mt-2">
            Scheduled for {new Date(item.suggestedPostAt).toLocaleDateString('en', {
              weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  );
}
