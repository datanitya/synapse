'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-white">SYNAPSE</h1>
          <p className="text-slate-400 text-lg">Your AI personal brand intelligence system</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 space-y-6 max-w-sm mx-auto">
          <div className="space-y-1">
            <h2 className="text-white font-semibold text-xl">Get started</h2>
            <p className="text-slate-400 text-sm">Connect your LinkedIn to begin</p>
          </div>

          <a
            href={`${API_URL}/api/auth/linkedin`}
            className="flex items-center justify-center gap-3 w-full bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Sign in with LinkedIn
          </a>

          <p className="text-slate-500 text-xs text-center">
            We only read your public profile and email.
            <br />
            We never post without your approval.
          </p>
        </div>
      </div>
    </div>
  );
}
