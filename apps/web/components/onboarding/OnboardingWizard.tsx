'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';

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
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

type Goal = 'GROW_NETWORK' | 'ESTABLISH_EXPERTISE' | 'ATTRACT_CLIENTS' | 'FIND_JOB' | 'BUILD_COMMUNITY' | 'SHARE_LEARNINGS';

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [niches, setNiches] = useState<string[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tone, setTone] = useState('PROFESSIONAL');
  const [frequency, setFrequency] = useState('THREE_TIMES_WEEK');
  const [days, setDays] = useState<string[]>(['TUESDAY', 'WEDNESDAY', 'THURSDAY']);

  function toggleItem<T extends string>(arr: T[], item: T, setter: (v: T[]) => void) {
    setter(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  }

  async function handleSubmit() {
    if (niches.length === 0 || goals.length === 0 || days.length === 0) {
      setError('Please complete all steps');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/onboarding/complete', {
        niche: niches[0],
        niches,
        goals,
        toneStyle: tone,
        postingFrequency: frequency,
        preferredDays: days,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const steps = [
    {
      title: 'What\'s your professional focus?',
      subtitle: 'Select all that apply',
      content: (
        <div className="flex flex-wrap gap-2">
          {NICHES.map((n) => (
            <button
              key={n}
              onClick={() => toggleItem(niches, n, setNiches)}
              className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                niches.includes(n)
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-600 text-slate-300 hover:border-blue-500'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      ),
      valid: niches.length > 0,
    },
    {
      title: 'What are your goals?',
      subtitle: 'Select all that apply',
      content: (
        <div className="space-y-2">
          {GOALS.map((g) => (
            <button
              key={g.value}
              onClick={() => toggleItem(goals, g.value as Goal, setGoals)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                goals.includes(g.value as Goal)
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'border-slate-600 text-slate-300 hover:border-slate-500'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      ),
      valid: goals.length > 0,
    },
    {
      title: 'How do you want to sound?',
      subtitle: 'Choose your writing tone',
      content: (
        <div className="space-y-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                tone === t.value
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'border-slate-600 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      title: 'When do you want to post?',
      subtitle: 'Set your posting rhythm',
      content: (
        <div className="space-y-6">
          <div>
            <p className="text-slate-400 text-sm mb-3">Frequency</p>
            <div className="flex gap-2 flex-wrap">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                    frequency === f.value
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-3">Preferred days</p>
            <div className="flex gap-2">
              {DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleItem(days, d, setDays)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    days.includes(d)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      valid: days.length > 0,
    },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-2">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-slate-500 text-xs">Step {step + 1} of {steps.length}</p>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{currentStep.title}</h1>
          <p className="text-slate-400">{currentStep.subtitle}</p>
        </div>

        <div className="min-h-48">{currentStep.content}</div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={isLast ? handleSubmit : () => setStep(step + 1)}
            disabled={!currentStep.valid || loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {loading ? 'Setting up…' : isLast ? 'Start building my brand' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
