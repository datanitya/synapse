'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';
import type { Notification } from '@synapse/types';

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="7" r="6"/>
    <polyline points="7,3.5 7,7 9.5,9.5"/>
  </svg>
);

const ChartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1,11 4.5,7 8,9 13,3"/>
    <polyline points="9.5,3 13,3 13,6.5"/>
  </svg>
);

const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 1.5H3a1 1 0 00-1 1v9a1 1 0 001 1h8a1 1 0 001-1V6L8.5 1.5z"/>
    <polyline points="8.5,1.5 8.5,6 13,6"/>
    <line x1="4" y1="8" x2="10" y2="8"/>
    <line x1="4" y1="10" x2="7.5" y2="10"/>
  </svg>
);

const BarChartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="5" width="3" height="7.5" rx="0.5"/>
    <rect x="5.5" y="2" width="3" height="10.5" rx="0.5"/>
    <rect x="9.5" y="7" width="3" height="5.5" rx="0.5"/>
  </svg>
);

const BellIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 1.5a4 4 0 014 4v2l1.5 2.5H1.5L3 7.5v-2a4 4 0 014-4z"/>
    <line x1="5.5" y1="11.5" x2="8.5" y2="11.5"/>
  </svg>
);

const TYPE_ICONS: Record<string, React.ReactNode> = {
  POSTING_REMINDER: <ClockIcon />,
  NEW_TRENDS_AVAILABLE: <ChartIcon />,
  DRAFT_READY: <FileIcon />,
  WEEKLY_SUMMARY: <BarChartIcon />,
};

const TYPE_COLORS: Record<string, string> = {
  POSTING_REMINDER: 'text-amber-400 bg-amber-900/30',
  NEW_TRENDS_AVAILABLE: 'text-blue-400 bg-blue-900/30',
  DRAFT_READY: 'text-emerald-400 bg-emerald-900/30',
  WEEKLY_SUMMARY: 'text-purple-400 bg-purple-900/30',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Notification[]>('/notifications').then(setNotifications).finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    await api.post('/notifications/mark-all-read');
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Inbox</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-slate-400 text-sm mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-slate-500 hover:text-blue-400 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-xl h-16 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24">
          <div className="inline-flex w-12 h-12 rounded-full bg-slate-800 items-center justify-center text-slate-500 mb-3">
            <BellIcon />
          </div>
          <p className="text-slate-500 text-sm">Nothing here yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.readAt && markRead(n.id)}
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                n.readAt
                  ? 'border-slate-800/60 bg-transparent opacity-50 hover:opacity-70'
                  : 'border-slate-700/50 bg-slate-900 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  TYPE_COLORS[n.type] ?? 'text-slate-400 bg-slate-800'
                }`}>
                  {TYPE_ICONS[n.type] ?? <BellIcon />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.readAt ? 'text-slate-500' : 'text-white'}`}>
                    {n.title}
                  </p>
                  <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-slate-600 text-xs mt-2">
                    {new Date(n.createdAt).toLocaleDateString('en', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                </div>
                {!n.readAt && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
