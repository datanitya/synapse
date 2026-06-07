'use client';

import { useState } from 'react';

interface Props {
  source: string;
  placeholder?: string;
  buttonLabel?: string;
}

export default function WaitlistForm({ source, placeholder = 'Your email', buttonLabel = 'Join Beta — Free' }: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('loading');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const data = await res.json() as { joined?: boolean; alreadyJoined?: boolean };
      if (data.alreadyJoined) {
        setState('duplicate');
      } else if (data.joined) {
        setState('success');
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2,8 6,12 14,4" />
        </svg>
        You&apos;re on the list! We&apos;ll be in touch soon.
      </div>
    );
  }

  if (state === 'duplicate') {
    return (
      <div className="text-slate-400 text-sm">
        Already registered — we&apos;ve got your email.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
      />
      <button
        type="submit"
        disabled={state === 'loading'}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
      >
        {state === 'loading' ? 'Joining…' : buttonLabel}
      </button>
      {state === 'error' && (
        <p className="text-red-400 text-xs mt-1 sm:col-span-2">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
