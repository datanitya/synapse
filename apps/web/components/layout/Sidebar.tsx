'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '../../lib/api-client';
import { useRouter } from 'next/navigation';

const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="5.5" height="5.5" rx="1.2"/>
    <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2"/>
    <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2"/>
    <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2"/>
  </svg>
);

const TrendingIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,12 4.5,7.5 8,9.5 14,3"/>
    <polyline points="10,3 14,3 14,7"/>
  </svg>
);

const PenIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 1.5l3 3-8 8-2.5.5.5-2.5 7-9z"/>
    <line x1="1.5" y1="13.5" x2="13.5" y2="13.5"/>
  </svg>
);

const FileIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1.5H3a1 1 0 00-1 1v10a1 1 0 001 1h9a1 1 0 001-1V6L9 1.5z"/>
    <polyline points="9,1.5 9,6 13.5,6"/>
    <line x1="4.5" y1="8.5" x2="10.5" y2="8.5"/>
    <line x1="4.5" y1="10.5" x2="8" y2="10.5"/>
  </svg>
);

const ArchiveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="5" width="12" height="8.5" rx="1"/>
    <path d="M1 5l1.5-3.5h10L14 5"/>
    <line x1="5.5" y1="9" x2="9.5" y2="9"/>
  </svg>
);

const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.5 1.5a4.5 4.5 0 014.5 4.5v2l1.5 2.5H1.5L3 8V6a4.5 4.5 0 014.5-4.5z"/>
    <line x1="6" y1="12.5" x2="9" y2="12.5"/>
  </svg>
);

const CogIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="7.5" r="2.5"/>
    <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3 3l1.1 1.1M10.9 10.9L12 12M3 12l1.1-1.1M10.9 4.1L12 3"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3.5" width="13" height="8" rx="1.5"/>
    <line x1="1" y1="6.5" x2="14" y2="6.5"/>
    <line x1="4" y1="9.5" x2="6" y2="9.5"/>
  </svg>
);

const LogOutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2.5h2.5a.5.5 0 01.5.5v9a.5.5 0 01-.5.5H10"/>
    <polyline points="6.5,10.5 10,7.5 6.5,4.5"/>
    <line x1="1" y1="7.5" x2="10" y2="7.5"/>
  </svg>
);

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',    Icon: GridIcon },
  { href: '/trends',       label: 'Trends',       Icon: TrendingIcon },
  { href: '/compose',      label: 'Compose',      Icon: PenIcon },
  { href: '/drafts',       label: 'Drafts',       Icon: FileIcon },
  { href: '/content-bank', label: 'Content Bank', Icon: ArchiveIcon },
  { href: '/notifications',label: 'Notifications',Icon: BellIcon },
  { href: '/billing',      label: 'Billing',      Icon: CreditCardIcon },
  { href: '/profile',      label: 'Profile',      Icon: CogIcon },
  { href: '/settings',     label: 'Settings',     Icon: CogIcon },
];


interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api.get<{ role?: string }>('/users/me')
      .then((u) => setIsAdmin((u as Record<string, unknown>).role === 'ADMIN'))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await api.post('/auth/logout').catch(() => {});
    router.push('/login');
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-56 bg-slate-900 border-r border-slate-800 flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white font-black text-[11px] tracking-widest">S</span>
          </div>
          <span className="text-white font-bold text-sm tracking-[0.15em]">SYNAPSE</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-slate-500 hover:text-white p-1 transition-colors"
            aria-label="Close menu"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13"/>
              <line x1="13" y1="1" x2="1" y2="13"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                active
                  ? 'bg-white/[0.07] text-white'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className={`shrink-0 transition-colors ${active ? 'text-blue-400' : ''}`}>
                <item.Icon />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Admin link */}
      {isAdmin && (
        <div className="px-3 pt-1 shrink-0">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 text-[12px] text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 rounded-lg transition-colors border border-red-900/30"
          >
            <span className="font-bold">⚡</span>
            Admin portal
          </Link>
        </div>
      )}

      {/* Sign out */}
      <div className="px-3 pb-4 pt-2 border-t border-slate-800 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-white/[0.04]"
        >
          <LogOutIcon />
          Sign out
        </button>
      </div>
    </aside>
  );
}
