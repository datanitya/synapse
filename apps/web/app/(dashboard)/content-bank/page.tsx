'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api-client';
import type { ContentType, Draft, DraftStatus } from '@synapse/types';

const TYPE_TABS: Array<ContentType | 'ALL'> = ['ALL', 'POST', 'BLOG', 'CAPTION', 'IMAGE'];

const TYPE_COLORS: Record<ContentType, string> = {
  POST: 'bg-blue-900/50 text-blue-400',
  BLOG: 'bg-purple-900/50 text-purple-400',
  CAPTION: 'bg-yellow-900/50 text-yellow-400',
  IMAGE: 'bg-pink-900/50 text-pink-400',
};

const STATUS_COLORS: Record<DraftStatus, string> = {
  DRAFT: 'bg-slate-800 text-slate-400',
  REFINED: 'bg-yellow-900/50 text-yellow-400',
  APPROVED: 'bg-green-900/50 text-green-400',
  PUBLISHED: 'bg-blue-900/50 text-blue-400',
  ARCHIVED: 'bg-slate-800 text-slate-600',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function ContentBankPage() {
  const [items, setItems] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<ContentType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get<Draft[]>('/content-bank').then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? items : items.filter((i) => i.contentType === filter);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Library</p>
          <h1 className="text-xl font-semibold text-white tracking-tight">Content Bank</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {items.filter((i) => i.status !== 'PUBLISHED').length} items
            {items.filter((i) => i.status === 'PUBLISHED').length > 0 && (
              <span className="text-green-500 ml-2">· {items.filter((i) => i.status === 'PUBLISHED').length} published</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          + Add Content
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
            <span className="ml-1.5 text-xs opacity-70">
              {t === 'ALL' ? items.length : items.filter((i) => i.contentType === t).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-xl h-24 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No content yet</p>
          <button onClick={() => setShowModal(true)} className="text-blue-400 text-sm hover:underline mt-1">
            Add your first item →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/content-bank/${item.id}`}
              className="block bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 p-4 transition-colors"
            >
              {item.contentType === 'IMAGE' && item.imageUrl ? (
                <div className="mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt="Content" className="w-full h-32 object-cover rounded-lg" />
                </div>
              ) : null}
              {item.title && (
                <p className="text-white font-semibold text-sm mb-1">{item.title}</p>
              )}
              {item.finalContent && (
                <p className="text-slate-300 text-sm line-clamp-2">{item.finalContent}</p>
              )}
              {!item.title && !item.finalContent && item.contentType !== 'IMAGE' && (
                <p className="text-slate-500 text-sm italic">No content yet</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[item.contentType]}`}>
                  {item.contentType}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}>
                  {item.status}
                </span>
                {item.status === 'PUBLISHED' && item.postedAt ? (
                  <span className="text-xs text-green-400">✓ Posted {formatDate(item.postedAt)}</span>
                ) : item.suggestedPostAt ? (
                  <span className="text-xs text-blue-400">📅 {formatDate(item.suggestedPostAt)}</span>
                ) : null}
                <span className="text-slate-600 text-xs ml-auto">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <AddContentModal
          onClose={() => setShowModal(false)}
          onCreated={(item) => { setItems((prev) => [item, ...prev]); setShowModal(false); }}
        />
      )}
    </div>
  );
}

// ─── Inline modal ─────────────────────────────────────────────────────────────

interface AddContentModalProps {
  onClose: () => void;
  onCreated: (item: Draft) => void;
}

function AddContentModal({ onClose, onCreated }: AddContentModalProps) {
  const [contentType, setContentType] = useState<ContentType>('POST');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [suggestedPostAt, setSuggestedPostAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const item = await api.post<Draft>('/content-bank', {
        contentType,
        title: title || undefined,
        content: content || undefined,
        imageUrl: imageUrl || undefined,
        suggestedPostAt: suggestedPostAt ? new Date(suggestedPostAt).toISOString() : undefined,
      });
      onCreated(item);
    } catch {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-semibold">Add to Content Bank</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Content type */}
          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Content type</label>
            <div className="flex gap-2 flex-wrap">
              {(['POST', 'BLOG', 'CAPTION', 'IMAGE'] as ContentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setContentType(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    contentType === t
                      ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Title (blogs) */}
          {contentType === 'BLOG' && (
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Text content */}
          {contentType !== 'IMAGE' && (
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={contentType === 'CAPTION' ? 'Write your caption…' : contentType === 'BLOG' ? 'Paste your article…' : 'Write your post…'}
                rows={contentType === 'BLOG' ? 8 : 4}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          )}

          {/* Image upload */}
          {(contentType === 'IMAGE' || contentType === 'CAPTION') && (
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">
                {contentType === 'IMAGE' ? 'Image *' : 'Image (optional)'}
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileUpload}
                disabled={uploading}
                className="text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600 file:cursor-pointer"
              />
              {uploading && <p className="text-slate-400 text-xs mt-1">Uploading…</p>}
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Preview" className="mt-2 rounded-lg max-h-32 object-cover" />
              )}
            </div>
          )}

          {/* Schedule */}
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1">Schedule for <span className="text-slate-500">(optional)</span></label>
            <input
              type="datetime-local"
              value={suggestedPostAt}
              onChange={(e) => setSuggestedPostAt(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 border border-slate-700 text-slate-400 rounded-lg text-sm hover:border-slate-600 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || uploading || (contentType === 'IMAGE' && !imageUrl)}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Saving…' : 'Add to bank'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
