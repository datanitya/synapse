'use client';

import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="2" y1="5" x2="16" y2="5"/>
              <line x1="2" y1="9" x2="16" y2="9"/>
              <line x1="2" y1="13" x2="16" y2="13"/>
            </svg>
          </button>
          <span className="text-white font-bold text-sm tracking-tight">SYNAPSE</span>
        </div>

        <main className="flex-1 flex flex-col min-h-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
