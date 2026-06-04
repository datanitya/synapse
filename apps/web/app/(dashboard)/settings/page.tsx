'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';
import type { UserWithPreferences, UserPreferences, AiProviderType } from '@synapse/types';

// ─── Constants (mirrors OnboardingWizard) ────────────────────────────────────

const NICHES = [
  'AI/ML Engineer', 'Product Manager', 'Software Engineer', 'Founder',
  'Marketer', 'Designer', 'Data Scientist', 'Consultant', 'Recruiter', 'Educator',
];
const GOALS = [
  { value: 'GROW_NETWORK', label: 'Grow my network' },
  { value: 'ESTABLISH_EXPERTISE', label: 'Establish thought leadership' },
  { value: 'ATTRACT_CLIENTS', label: 'Attract clients' },
  { value: 'FIND_JOB', label: 'Find new opportunities' },
  { value: 'BUILD_COMMUNITY', label: 'Build a community' },
  { value: 'SHARE_LEARNINGS', label: 'Share knowledge' },
];
const TONES = [
  { value: 'PROFESSIONAL', label: 'Professional', desc: 'Formal, authoritative, data-driven' },
  { value: 'CONVERSATIONAL', label: 'Conversational', desc: 'Warm, approachable, personal' },
  { value: 'THOUGHT_LEADER', label: 'Thought Leader', desc: 'Bold opinions, challenges status quo' },
  { value: 'STORYTELLER', label: 'Storyteller', desc: 'Narrative-driven, emotional connection' },
  { value: 'EDUCATIONAL', label: 'Educational', desc: 'Clear, step-by-step, teaching mindset' },
  { value: 'INSPIRATIONAL', label: 'Inspirational', desc: 'Motivational, uplifting, action-oriented' },
];
const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'THREE_TIMES_WEEK', label: '3× / week' },
  { value: 'TWICE_WEEK', label: '2× / week' },
  { value: 'WEEKLY', label: 'Weekly' },
];
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const HOOK_STYLES = [
  { value: 'contrarian', label: 'Contrarian', desc: 'Challenge the common view' },
  { value: 'personal-story', label: 'Personal Story', desc: 'Start with a real moment' },
  { value: 'data-driven', label: 'Data-Driven', desc: 'Lead with a stat or fact' },
  { value: 'question', label: 'Question', desc: 'Open with a bold question' },
  { value: 'listicle', label: 'Listicle', desc: '3 things / 5 lessons style' },
];
const WRITING_STYLES = [
  { value: 'punchy', label: 'Punchy', desc: 'Short lines, high energy' },
  { value: 'detailed', label: 'Detailed', desc: 'Long-form, thorough' },
  { value: 'balanced', label: 'Balanced', desc: 'Mix of both' },
];
const SENTENCE_LENGTHS = [
  { value: 'short', label: 'Short', desc: '1–2 words per line' },
  { value: 'medium', label: 'Medium', desc: 'Natural paragraph flow' },
  { value: 'long', label: 'Long', desc: 'Dense, detailed paragraphs' },
];
const CTA_STYLES = [
  { value: 'question', label: 'End with question', desc: 'Invite a reply' },
  { value: 'reflection', label: 'Reflection prompt', desc: 'Thought-provoking close' },
  { value: 'action', label: 'Call to action', desc: 'Explicit "do this"' },
  { value: 'none', label: 'No CTA', desc: 'Let the content speak' },
];
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

// ─── Form state type ──────────────────────────────────────────────────────────

interface FormState {
  niches: string[];
  goals: string[];
  toneStyle: string;
  postingFrequency: string;
  preferredDays: string[];
  timezone: string;
  emailNotifications: boolean;
  targetAudience: string;
  avoidTopics: string;
  writingExamples: [string, string, string];
  hookStyle: string;
  writingStyle: string;
  sentenceLength: string;
  ctaStyle: string;
  valueProposition: string;
}

function prefsToForm(prefs: UserPreferences): FormState {
  const p = prefs as unknown as Record<string, string | undefined>;
  return {
    niches: prefs.niches,
    goals: prefs.goals as string[],
    toneStyle: prefs.toneStyle,
    postingFrequency: prefs.postingFrequency,
    preferredDays: prefs.preferredDays as string[],
    timezone: prefs.timezone,
    emailNotifications: prefs.emailNotifications,
    targetAudience: prefs.targetAudience ?? '',
    avoidTopics: prefs.avoidTopics.join(', '),
    writingExamples: [
      prefs.writingExamples[0] ?? '',
      prefs.writingExamples[1] ?? '',
      prefs.writingExamples[2] ?? '',
    ],
    hookStyle: p.hookStyle ?? '',
    writingStyle: p.writingStyle ?? '',
    sentenceLength: p.sentenceLength ?? '',
    ctaStyle: p.ctaStyle ?? '',
    valueProposition: p.valueProposition ?? '',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [user, setUser] = useState<UserWithPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // AI provider credentials
  const [aiProvider, setAiProvider] = useState<AiProviderType | ''>('');
  const [aiModel, setAiModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [credSaving, setCredSaving] = useState(false);
  const [credMsg, setCredMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // LinkedIn company credentials
  const [liClientId, setLiClientId] = useState('');
  const [liClientSecret, setLiClientSecret] = useState('');
  const [liCompanyId, setLiCompanyId] = useState('');
  const [liSaving, setLiSaving] = useState(false);
  const [liMsg, setLiMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api.get<UserWithPreferences>('/users/me').then((u) => {
      setUser(u);
      if (u.preferences) {
        setForm(prefsToForm(u.preferences));
        if (u.preferences.aiProvider) setAiProvider(u.preferences.aiProvider);
        if (u.preferences.aiModel) setAiModel(u.preferences.aiModel);
        if (u.preferences.linkedinClientId) setLiClientId(u.preferences.linkedinClientId);
        if (u.preferences.linkedinCompanyId) setLiCompanyId(u.preferences.linkedinCompanyId);
      }
    }).finally(() => setLoading(false));
  }, []);

  function startEditing() {
    if (user?.preferences) setForm(prefsToForm(user.preferences));
    setSaveError('');
    setEditing(true);
  }

  function cancelEditing() {
    if (user?.preferences) setForm(prefsToForm(user.preferences));
    setSaveError('');
    setEditing(false);
  }

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        niches: form.niches,
        niche: form.niches[0],
        goals: form.goals,
        toneStyle: form.toneStyle,
        postingFrequency: form.postingFrequency,
        preferredDays: form.preferredDays,
        timezone: form.timezone,
        emailNotifications: form.emailNotifications,
        targetAudience: form.targetAudience || undefined,
        avoidTopics: form.avoidTopics.split(',').map((s) => s.trim()).filter(Boolean),
        writingExamples: form.writingExamples.filter(Boolean),
        hookStyle: form.hookStyle || undefined,
        writingStyle: form.writingStyle || undefined,
        sentenceLength: form.sentenceLength || undefined,
        ctaStyle: form.ctaStyle || undefined,
        valueProposition: form.valueProposition || undefined,
      };
      const updated = await api.patch<UserPreferences>('/users/preferences', payload);
      setUser((u) => u ? { ...u, preferences: updated } : u);
      setEditing(false);
    } catch {
      setSaveError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAiCredentials() {
    if (!aiProvider) return;
    setCredSaving(true);
    setCredMsg(null);
    try {
      const payload: Record<string, string> = { aiProvider, aiModel };
      if (apiKey.trim()) {
        if (aiProvider === 'OPENAI') payload.openaiApiKey = apiKey.trim();
        if (aiProvider === 'GEMINI') payload.geminiApiKey = apiKey.trim();
        if (aiProvider === 'CLAUDE') payload.anthropicApiKey = apiKey.trim();
      }
      await api.patch('/users/credentials', payload);
      setApiKey('');
      setCredMsg({ ok: true, text: 'AI provider saved.' });
      setUser((u) => u && u.preferences ? {
        ...u,
        preferences: { ...u.preferences, aiProvider: aiProvider as AiProviderType, aiModel: aiModel || null },
      } : u);
    } catch {
      setCredMsg({ ok: false, text: 'Save failed. Please try again.' });
    } finally {
      setCredSaving(false);
    }
  }

  async function handleSaveLiCredentials() {
    setLiSaving(true);
    setLiMsg(null);
    try {
      const payload: Record<string, string> = { linkedinClientId: liClientId, linkedinCompanyId: liCompanyId };
      if (liClientSecret.trim()) payload.linkedinClientSecret = liClientSecret.trim();
      await api.patch('/users/credentials', payload);
      setLiClientSecret('');
      setLiMsg({ ok: true, text: 'LinkedIn credentials saved.' });
    } catch {
      setLiMsg({ ok: false, text: 'Save failed. Please try again.' });
    } finally {
      setLiSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!user) return <div className="p-8 text-slate-400">Could not load settings</div>;

  const prefs = user.preferences;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Configuration</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Brand preferences and AI configuration</p>
      </div>

      {/* Brand Preferences */}
      {prefs && form && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">Brand Preferences</h2>
            {!editing && (
              <button onClick={startEditing} className="text-xs px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 transition-colors">
                Edit preferences
              </button>
            )}
          </div>

          {!editing ? (
            /* Read-only view */
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Niches</p>
                <div className="flex flex-wrap gap-1.5">
                  {prefs.niches.map((n) => (
                    <span key={n} className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full">{n}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Writing Tone</p>
                <p className="text-white text-sm">{TONES.find((t) => t.value === prefs.toneStyle)?.label ?? prefs.toneStyle}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Frequency</p>
                <p className="text-white text-sm">{FREQUENCIES.find((f) => f.value === prefs.postingFrequency)?.label ?? prefs.postingFrequency}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Preferred Days</p>
                <p className="text-white text-sm">{(prefs.preferredDays as string[]).map((d) => DAY_LABELS[d] ?? d).join(', ')}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Timezone</p>
                <p className="text-white text-sm">{prefs.timezone}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Notifications</p>
                <p className="text-white text-sm">{prefs.emailNotifications ? 'Email enabled' : 'Email disabled'}</p>
              </div>
            </div>
          ) : (
            /* Edit form */
            <div className="p-5 space-y-6">

              {/* Niches */}
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Niches <span className="text-slate-500 font-normal">(select all that apply)</span></p>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm((f) => f ? { ...f, niches: toggle(f.niches, n) } : f)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.niches.includes(n)
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goals */}
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Goals</p>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setForm((f) => f ? { ...f, goals: toggle(f.goals, g.value) } : f)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.goals.includes(g.value)
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Writing Tone</p>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm((f) => f ? { ...f, toneStyle: t.value } : f)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        form.toneStyle === t.value
                          ? 'border-blue-500 bg-blue-600/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <p className={`text-sm font-medium ${form.toneStyle === t.value ? 'text-blue-400' : 'text-white'}`}>{t.label}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Posting Frequency</p>
                <div className="flex gap-2 flex-wrap">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setForm((fm) => fm ? { ...fm, postingFrequency: f.value } : fm)}
                      className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                        form.postingFrequency === f.value
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days */}
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Preferred Days</p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm((f) => f ? { ...f, preferredDays: toggle(f.preferredDays, d) } : f)}
                      className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
                        form.preferredDays.includes(d)
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone */}
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Timezone</p>
                <input
                  value={form.timezone}
                  onChange={(e) => setForm((f) => f ? { ...f, timezone: e.target.value } : f)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Notifications */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.emailNotifications}
                    onChange={(e) => setForm((f) => f ? { ...f, emailNotifications: e.target.checked } : f)}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Email notifications</p>
                    <p className="text-slate-500 text-xs">Receive daily digest emails with generated posts</p>
                  </div>
                </label>
              </div>

              {/* Target audience */}
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Target Audience <span className="text-slate-500 font-normal">(optional)</span></p>
                <input
                  value={form.targetAudience}
                  onChange={(e) => setForm((f) => f ? { ...f, targetAudience: e.target.value } : f)}
                  placeholder="e.g. Early-stage startup founders, B2B SaaS companies"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Avoid topics */}
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Topics to Avoid <span className="text-slate-500 font-normal">(comma-separated)</span></p>
                <input
                  value={form.avoidTopics}
                  onChange={(e) => setForm((f) => f ? { ...f, avoidTopics: e.target.value } : f)}
                  placeholder="e.g. politics, crypto, religion"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Writing examples */}
              <div>
                <p className="text-slate-300 text-sm font-medium mb-2">Writing Examples <span className="text-slate-500 font-normal">(up to 3 past posts — helps AI match your voice)</span></p>
                <div className="space-y-2">
                  {([0, 1, 2] as const).map((i) => (
                    <textarea
                      key={i}
                      value={form.writingExamples[i]}
                      onChange={(e) => setForm((f) => {
                        if (!f) return f;
                        const ex = [...f.writingExamples] as [string, string, string];
                        ex[i] = e.target.value;
                        return { ...f, writingExamples: ex };
                      })}
                      placeholder={`Example ${i + 1} (paste a LinkedIn post you wrote)`}
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  ))}
                </div>
              </div>

              {/* Advanced Voice */}
              <div className="border-t border-slate-800 pt-5">
                <p className="text-slate-300 text-sm font-medium mb-4">Advanced Voice <span className="text-slate-500 font-normal">(optional — adds precision to AI generation)</span></p>

                <div className="space-y-5">
                  {/* Hook Style */}
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Hook style</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {HOOK_STYLES.map((h) => (
                        <button
                          key={h.value}
                          type="button"
                          onClick={() => setForm((f) => f ? { ...f, hookStyle: f.hookStyle === h.value ? '' : h.value } : f)}
                          className={`text-left p-2.5 rounded-lg border transition-colors ${
                            form.hookStyle === h.value
                              ? 'border-blue-500 bg-blue-600/10'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <p className={`text-xs font-medium ${form.hookStyle === h.value ? 'text-blue-400' : 'text-white'}`}>{h.label}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{h.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Writing Style */}
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Writing style</p>
                    <div className="flex gap-2 flex-wrap">
                      {WRITING_STYLES.map((w) => (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => setForm((f) => f ? { ...f, writingStyle: f.writingStyle === w.value ? '' : w.value } : f)}
                          className={`text-left p-2.5 rounded-lg border transition-colors flex-1 ${
                            form.writingStyle === w.value
                              ? 'border-blue-500 bg-blue-600/10'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <p className={`text-xs font-medium ${form.writingStyle === w.value ? 'text-blue-400' : 'text-white'}`}>{w.label}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{w.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sentence Length */}
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Sentence / paragraph length</p>
                    <div className="flex gap-2 flex-wrap">
                      {SENTENCE_LENGTHS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setForm((f) => f ? { ...f, sentenceLength: f.sentenceLength === s.value ? '' : s.value } : f)}
                          className={`text-left p-2.5 rounded-lg border transition-colors flex-1 ${
                            form.sentenceLength === s.value
                              ? 'border-blue-500 bg-blue-600/10'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <p className={`text-xs font-medium ${form.sentenceLength === s.value ? 'text-blue-400' : 'text-white'}`}>{s.label}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{s.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CTA Style */}
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Post ending / CTA</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CTA_STYLES.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setForm((f) => f ? { ...f, ctaStyle: f.ctaStyle === c.value ? '' : c.value } : f)}
                          className={`text-left p-2.5 rounded-lg border transition-colors ${
                            form.ctaStyle === c.value
                              ? 'border-blue-500 bg-blue-600/10'
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <p className={`text-xs font-medium ${form.ctaStyle === c.value ? 'text-blue-400' : 'text-white'}`}>{c.label}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{c.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Value Proposition */}
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Value proposition <span className="text-slate-600">(optional)</span></p>
                    <input
                      value={form.valueProposition}
                      onChange={(e) => setForm((f) => f ? { ...f, valueProposition: e.target.value } : f)}
                      placeholder='e.g. "I help early-stage founders build in public and attract the right investors"'
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || form.niches.length === 0}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save preferences'}
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-5 py-2.5 border border-slate-700 text-slate-300 text-sm rounded-lg hover:border-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Provider */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <div>
          <h2 className="text-white font-semibold">AI Provider</h2>
          <p className="text-slate-500 text-xs mt-0.5">Your API key is encrypted at rest. Leave blank to use the platform default.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => { setAiProvider(e.target.value as AiProviderType); setAiModel(''); }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Platform default</option>
              <option value="GEMINI">Google Gemini</option>
              <option value="OPENAI">OpenAI</option>
              <option value="CLAUDE">Anthropic Claude</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">Model</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              disabled={!aiProvider}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-40"
            >
              <option value="">Default for provider</option>
              {aiProvider === 'GEMINI' && <>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </>}
              {aiProvider === 'OPENAI' && <>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
              </>}
              {aiProvider === 'CLAUDE' && <>
                <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
                <option value="claude-opus-4-8">claude-opus-4-8</option>
              </>}
            </select>
          </div>
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">
            API Key
            {user.preferences?.hasOpenaiKey && aiProvider === 'OPENAI' && <span className="text-green-400 ml-2">✓ saved</span>}
            {user.preferences?.hasGeminiKey && aiProvider === 'GEMINI' && <span className="text-green-400 ml-2">✓ saved</span>}
            {user.preferences?.hasAnthropicKey && aiProvider === 'CLAUDE' && <span className="text-green-400 ml-2">✓ saved</span>}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={aiProvider ? 'Paste new API key (leave blank to keep existing)' : 'Select a provider first'}
            disabled={!aiProvider}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-40"
          />
        </div>
        {credMsg && <p className={`text-xs ${credMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{credMsg.text}</p>}
        <button
          onClick={handleSaveAiCredentials}
          disabled={credSaving || !aiProvider}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {credSaving ? 'Saving…' : 'Save AI settings'}
        </button>
      </div>

      {/* LinkedIn Company Credentials */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <div>
          <h2 className="text-white font-semibold">LinkedIn Company</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Register a LinkedIn Developer app at{' '}
            <span className="text-blue-400">developers.linkedin.com</span>
            {' '}with <code className="text-slate-300 text-xs">w_organization_social</code> scope to enable company page posting.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 text-xs mb-1 block">App Client ID</label>
            <input
              value={liClientId}
              onChange={(e) => setLiClientId(e.target.value)}
              placeholder="86xxxxxxxxxxxxx"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs mb-1 block">
              App Client Secret
              {user.preferences?.hasLinkedinSecret && <span className="text-green-400 ml-2">✓ saved</span>}
            </label>
            <input
              type="password"
              value={liClientSecret}
              onChange={(e) => setLiClientSecret(e.target.value)}
              placeholder="Leave blank to keep existing"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Company Page ID or URN</label>
          <input
            value={liCompanyId}
            onChange={(e) => setLiCompanyId(e.target.value)}
            placeholder="e.g. 1234567 or urn:li:organization:1234567"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        {liMsg && <p className={`text-xs ${liMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{liMsg.text}</p>}
        <button
          onClick={handleSaveLiCredentials}
          disabled={liSaving}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {liSaving ? 'Saving…' : 'Save LinkedIn credentials'}
        </button>
      </div>

    </div>
  );
}
