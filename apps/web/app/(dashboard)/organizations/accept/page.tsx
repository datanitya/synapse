'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../../lib/api-client';

function AcceptInviteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No invite token found in the link. Please ask for a new invitation.');
      return;
    }

    api.post<{ joined: boolean; orgId: string }>(`/organizations/invites/${token}/accept`)
      .then((res) => {
        setOrgId(res.orgId);
        setStatus('success');
      })
      .catch((e: any) => {
        setStatus('error');
        setMessage(e?.message ?? 'This invite is invalid or has expired. Please ask for a new one.');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Accepting invitation…</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 14l7 7L23 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-white text-xl font-semibold">You're in!</h2>
          <p className="text-slate-400 text-sm mt-1">You've joined the organization successfully.</p>
        </div>
        <button
          onClick={() => router.push('/organizations')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          View organization →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
          <line x1="6" y1="6" x2="22" y2="22" /><line x1="22" y1="6" x2="6" y2="22" />
        </svg>
      </div>
      <div>
        <h2 className="text-white text-xl font-semibold">Invite failed</h2>
        <p className="text-slate-400 text-sm mt-1 max-w-sm">{message}</p>
      </div>
      <button
        onClick={() => router.push('/dashboard')}
        className="px-6 py-2.5 border border-slate-700 text-slate-300 text-sm rounded-lg hover:border-slate-600 transition-colors"
      >
        Go to dashboard
      </button>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 mb-4">
            <span className="text-white font-black text-[13px] tracking-widest">S</span>
          </div>
          <p className="text-slate-500 text-xs uppercase tracking-widest">SYNAPSE</p>
        </div>
        <Suspense fallback={
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        }>
          <AcceptInviteContent />
        </Suspense>
      </div>
    </div>
  );
}
