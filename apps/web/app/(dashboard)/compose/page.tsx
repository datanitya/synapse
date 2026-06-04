'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { api, ApiError } from '../../../lib/api-client';
import type { Draft, TimingRecommendation } from '@synapse/types';

function ComposeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const posthog = usePostHog();

  const [contentType, setContentType] = useState<'POST' | 'BLOG' | 'IMAGE'>('POST');
  const [topic, setTopic] = useState(searchParams.get('topic') ?? '');
  const [trendId] = useState(searchParams.get('trendId') ?? undefined);
  const [customContext, setCustomContext] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [timing, setTiming] = useState<TimingRecommendation | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);

  // Image panel
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imageMode, setImageMode] = useState<'generate' | 'upload'>('generate');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<TimingRecommendation>('/timing/recommendation').then(setTiming).catch(() => null);
  }, []);

  async function handleGenerate() {
    if (!topic.trim()) { setError('Please enter a topic'); return; }
    setGenerating(true);
    setError('');
    setLimitReached(false);
    setDraft(null);
    try {
      const result = await api.post<Draft>('/content/generate', {
        topic,
        trendId,
        customContext: customContext || undefined,
        contentType,
      });
      setDraft(result);
      posthog?.capture('post_generated', { contentType, hasTrend: !!trendId });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 429) {
        setLimitReached(true);
      } else if (e instanceof ApiError && e.status >= 500) {
        setError('Something went wrong on our end. Please try again.');
      } else {
        setError('Generation failed. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) return;
    setGeneratingImage(true);
    setImageError('');
    try {
      const result = await api.post<{ imageUrl: string }>('/images/generate', { prompt: imagePrompt });
      setImageUrl(result.imageUrl);
      setImagePreview(result.imageUrl);
    } catch {
      setImageError('Image generation failed. Please try again.');
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGeneratingImage(true);
    setImageError('');
    setImagePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await api.upload<{ imageUrl: string }>('/images/upload', fd);
      setImageUrl(result.imageUrl);
      setImagePreview(result.imageUrl);
    } catch {
      setImageError('Upload failed. Please try again.');
      setImagePreview('');
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleSelectVariation(variationId: string) {
    if (!draft) return;
    const updated = await api.patch<Draft>(`/drafts/${draft.id}/select-variation/${variationId}`);
    setDraft(updated);
  }

  async function handleSaveDraft() {
    if (!draft) return;
    setSaving(true);
    await api.patch(`/drafts/${draft.id}`, {
      status: 'DRAFT',
      ...(imageUrl ? { imageUrl } : {}),
    });
    router.push('/drafts');
  }

  const isBlog = contentType === 'BLOG';
  const isImage = contentType === 'IMAGE';

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">AI Generation</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Compose</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            {/* Content type toggle */}
            <div className="flex gap-1 p-1 bg-slate-800 rounded-lg w-fit">
              {(['POST', 'BLOG', 'IMAGE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setContentType(t); setDraft(null); setError(''); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    contentType === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'POST' ? '✍️ Post' : t === 'BLOG' ? '📝 Article' : '🖼️ Image'}
                </button>
              ))}
            </div>

            <div>
              <label className="text-slate-300 text-sm font-medium block mb-2">
                {isImage ? 'Image topic *' : isBlog ? 'Article topic *' : 'Topic or idea *'}
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={isImage ? 'e.g. The future of remote work, leadership under pressure' : isBlog ? 'e.g. The future of remote work in product companies' : 'e.g. Why most AI products fail in Year 1'}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-2">Additional context <span className="text-slate-500">(optional)</span></label>
              <textarea
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Any specific angle, personal experience, or data point to include…"
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* Image panel toggle — hidden when Image tab is active */}
            {!isImage && <div>
              <button
                type="button"
                onClick={() => setShowImagePanel((v) => !v)}
                className="text-sm text-slate-400 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <span className={`transition-transform ${showImagePanel ? 'rotate-90' : ''}`}>▶</span>
                {showImagePanel ? 'Hide image panel' : 'Add an image (optional)'}
              </button>

              {showImagePanel && (
                <div className="mt-3 bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
                  <div className="flex gap-2">
                    {(['generate', 'upload'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setImageMode(m); setImageUrl(''); setImagePreview(''); setImageError(''); }}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          imageMode === m ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m === 'generate' ? '✨ Generate with AI' : '📁 Upload file'}
                      </button>
                    ))}
                  </div>

                  {imageMode === 'generate' ? (
                    <div className="space-y-2">
                      <textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Describe the image you want… e.g. A minimalist illustration of a person leading a team meeting"
                        rows={2}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
                      />
                      <button
                        onClick={handleGenerateImage}
                        disabled={generatingImage || !imagePrompt.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                      >
                        {generatingImage ? 'Generating…' : 'Generate image'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleUploadImage}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={generatingImage}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm rounded-lg border border-slate-600 transition-colors"
                      >
                        {generatingImage ? 'Uploading…' : 'Choose image file'}
                      </button>
                    </div>
                  )}

                  {imageError && <p className="text-red-400 text-xs">{imageError}</p>}
                  {imagePreview && (
                    <div>
                      <p className="text-xs text-green-400 mb-1">✓ Image ready</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Preview" className="rounded-lg max-h-40 object-cover" />
                      <button
                        onClick={() => { setImageUrl(''); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-xs text-slate-500 hover:text-red-400 mt-1 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>}

            {limitReached && (
              <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-amber-300 text-sm">You&apos;ve reached your monthly token limit.</p>
                <a href="/billing" className="text-blue-400 hover:text-blue-300 text-sm font-medium shrink-0 transition-colors">
                  Upgrade plan →
                </a>
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isImage ? 'Generating image + caption…' : isBlog ? 'Writing article…' : 'Generating 3 variations…'}
                </span>
              ) : isImage ? 'Generate image + caption' : isBlog ? 'Write article' : 'Generate post'}
            </button>
          </div>

          {/* Post variations */}
          {draft && contentType === 'POST' && (
            <div className="space-y-3">
              <h2 className="text-white font-semibold">Choose a variation</h2>
              {draft.variations.map((v) => (
                <div
                  key={v.id}
                  onClick={() => handleSelectVariation(v.id)}
                  className={`bg-slate-900 rounded-xl border p-5 cursor-pointer transition-colors ${
                    v.selected ? 'border-blue-500 bg-blue-900/10' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{v.label}</span>
                    {v.selected && <span className="text-xs text-blue-400 font-medium">Selected ✓</span>}
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{v.content}</p>
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={handleGenerate} disabled={generating} className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl text-sm hover:border-slate-600 transition-colors">
                  Regenerate
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !draft.variations.some((v) => v.selected)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {saving ? 'Saving…' : 'Save draft →'}
                </button>
              </div>
            </div>
          )}

          {/* Blog article display */}
          {draft && contentType === 'BLOG' && (
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                  {draft.title && (
                    <h2 className="text-white font-bold text-lg mb-1">{draft.title}</h2>
                  )}
                  <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">Article draft</span>
                </div>
                <div className="p-5">
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{draft.finalContent}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleGenerate} disabled={generating} className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl text-sm hover:border-slate-600 transition-colors">
                  Regenerate
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {saving ? 'Saving…' : 'Save draft →'}
                </button>
              </div>
            </div>
          )}

          {/* Image + caption display */}
          {draft && contentType === 'IMAGE' && (
            <div className="space-y-3">
              <h2 className="text-white font-semibold">Generated image + caption</h2>
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                {draft.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.imageUrl} alt="Generated" className="w-full object-cover max-h-80" />
                )}
                <div className="p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Caption</p>
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{draft.finalContent}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleGenerate} disabled={generating} className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl text-sm hover:border-slate-600 transition-colors">
                  Regenerate
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {saving ? 'Saving…' : 'Save draft →'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {timing && timing.slots.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <h3 className="text-slate-300 text-sm font-semibold mb-3">Best times to post</h3>
              <div className="space-y-2">
                {timing.slots.map((slot, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${i === 0 ? 'bg-green-900/50 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                      {i === 0 ? 'BEST' : `#${i + 1}`}
                    </span>
                    <div>
                      <p className="text-white text-xs font-medium">
                        {new Date(slot.datetime).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(slot.datetime).toLocaleTimeString('en', { hour: 'numeric', hour12: true })}
                      </p>
                      <p className="text-slate-500 text-xs">{slot.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <ComposeContent />
    </Suspense>
  );
}
