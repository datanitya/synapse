'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-900/40 flex items-center justify-center mb-5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-white text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
        {error.message || 'An unexpected error occurred. The team has been notified.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="px-5 py-2.5 border border-slate-700 hover:border-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
        >
          Go to dashboard
        </a>
      </div>
      {error.digest && (
        <p className="text-slate-700 text-xs mt-6 font-mono">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
