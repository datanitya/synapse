'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api-client';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
  role: string;
  plan: { id: string; displayName: string; tier: string; monthlyTokenLimit: number } | null;
  tokensThisMonth: number;
  percentUsed: number;
  usePlatformKey: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

interface Plan {
  id: string;
  displayName: string;
  tier: string;
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [togglingAccess, setTogglingAccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<UsersResponse>('/admin/users'),
      api.get<Plan[]>('/admin/plans'),
    ]).then(([d, p]) => {
      setData(d);
      setPlans(p);
    }).finally(() => setLoading(false));
  }, []);

  async function handleAssignPlan(userId: string, planId: string) {
    setChangingPlan(userId);
    try {
      await api.post(`/admin/users/${userId}/plan`, { planId });
      const fresh = await api.get<UsersResponse>('/admin/users');
      setData(fresh);
    } finally {
      setChangingPlan(null);
    }
  }

  async function handleTogglePlatformAccess(userId: string, current: boolean) {
    setTogglingAccess(userId);
    try {
      await api.post(`/admin/users/${userId}/platform-access`, { allow: !current });
      setData((prev) => prev ? {
        ...prev,
        users: prev.users.map((u) => u.id === userId ? { ...u, usePlatformKey: !current } : u),
      } : prev);
    } finally {
      setTogglingAccess(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Users</h1>
          <p className="text-slate-400 text-sm mt-1">{data?.total ?? 0} total users</p>
        </div>
      </div>

      {/* Platform key access legend */}
      <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl px-5 py-3 flex items-start gap-3">
        <span className="text-amber-400 text-lg shrink-0">⚠</span>
        <div>
          <p className="text-amber-400 text-sm font-medium">Platform API Key Access</p>
          <p className="text-amber-600 text-xs mt-0.5">
            Toggling <strong>Platform key</strong> on allows that user to generate AI content using the platform&apos;s API key (.env).
            By default all users must add their own API key in Settings.
            Only grant this to trusted users or beta testers.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-5 py-3 font-medium">User</th>
                <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">Plan</th>
                <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium hidden sm:table-cell">Tokens</th>
                <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">Platform key</th>
                <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">Change plan</th>
              </tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((user) => (
                <tr key={user.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                  {/* User */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {user.profilePictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.profilePictureUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">
                          {user.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </div>
                      {user.role === 'ADMIN' && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-900/40 text-red-400 border border-red-800/40 rounded">Admin</span>
                      )}
                    </div>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3">
                    <span className="text-slate-300 text-sm">{user.plan?.displayName ?? 'Free'}</span>
                  </td>

                  {/* Tokens */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">{user.tokensThisMonth.toLocaleString()}</span>
                      {user.percentUsed > 0 && (
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${user.percentUsed >= 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${user.percentUsed}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Platform key toggle */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleTogglePlatformAccess(user.id, user.usePlatformKey)}
                      disabled={togglingAccess === user.id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                        user.usePlatformKey ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                      title={user.usePlatformKey ? 'Using platform key — click to revoke' : 'Click to grant platform key access'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          user.usePlatformKey ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    {user.usePlatformKey && (
                      <span className="ml-2 text-[10px] text-amber-500 font-medium">Active</span>
                    )}
                  </td>

                  {/* Change plan */}
                  <td className="px-4 py-3">
                    <select
                      value={user.plan?.id ?? ''}
                      onChange={(e) => handleAssignPlan(user.id, e.target.value)}
                      disabled={changingPlan === user.id}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">No plan</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.displayName}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data?.users ?? []).length === 0 && (
            <p className="p-8 text-slate-500 text-sm text-center">No users yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
