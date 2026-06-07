import Link from 'next/link';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Nav */}
      <header className="border-b border-slate-800/60 sticky top-0 z-50 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[11px] tracking-widest">S</span>
            </div>
            <span className="text-white font-bold text-sm tracking-[0.15em]">SYNAPSE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Sign in
            </Link>
            <a
              href="#waitlist"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Join Beta
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-[9px] tracking-widest">S</span>
            </div>
            <span className="text-slate-500 text-xs">© 2025 SYNAPSE</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-slate-500 hover:text-slate-400 text-xs transition-colors">Privacy</Link>
            <Link href="/terms" className="text-slate-500 hover:text-slate-400 text-xs transition-colors">Terms</Link>
            <Link href="/contact" className="text-slate-500 hover:text-slate-400 text-xs transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
