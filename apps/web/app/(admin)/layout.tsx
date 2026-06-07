'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/plans', label: 'Plans' },
  { href: '/admin/payments', label: 'Payments' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-20 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60">
          <p className="text-white font-bold text-sm tracking-tight">SYNAPSE</p>
          <span className="text-xs px-1.5 py-0.5 bg-red-900/50 text-red-400 border border-red-800/40 rounded font-medium">Admin</span>
          <Link href="/dashboard" className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← App
          </Link>
        </div>
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 py-2 gap-1">
          {NAV.map(({ href, label }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-52 bg-slate-900 border-r border-slate-800 flex-col shrink-0 min-h-screen">
        <div className="p-4 border-b border-slate-800">
          <p className="text-white font-bold text-sm tracking-tight">SYNAPSE</p>
          <span className="text-xs px-1.5 py-0.5 bg-red-900/50 text-red-400 border border-red-800/40 rounded font-medium">Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ href, label }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Back to app
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
