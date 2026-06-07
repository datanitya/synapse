'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';

interface OrgMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  joinedAt: string;
  user: { id: string; name: string; email: string; profilePictureUrl: string | null };
}

interface OrgInvite {
  id: string;
  email: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  expiresAt: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members: OrgMember[];
  invites: OrgInvite[];
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/40',
  EDITOR: 'text-blue-400 bg-blue-900/20 border-blue-800/40',
  VIEWER: 'text-slate-400 bg-slate-800 border-slate-700',
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    try {
      const data = await api.get<Org[]>('/organizations');
      setOrgs(data);
      if (data[0] && !selectedOrg) setSelectedOrg(data[0]);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newOrgName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const org = await api.post<Org>('/organizations', { name: newOrgName.trim() });
      setNewOrgName('');
      await loadOrgs();
      setSelectedOrg(org);
      setSuccess('Organization created');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite() {
    if (!selectedOrg || !inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      const res = await api.post<{ inviteToken: string; email: string }>(`/organizations/${selectedOrg.id}/invites`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setSuccess(`Invite sent to ${res.email}. Token: ${res.inviteToken.slice(0, 8)}…`);
      await refreshSelected();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    if (!selectedOrg) return;
    try {
      await api.delete(`/organizations/${selectedOrg.id}/invites/${inviteId}`);
      await refreshSelected();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to cancel invite');
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!selectedOrg || !confirm('Remove this member?')) return;
    try {
      await api.delete(`/organizations/${selectedOrg.id}/members/${memberId}`);
      await refreshSelected();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to remove member');
    }
  }

  async function refreshSelected() {
    if (!selectedOrg) return;
    const updated = await api.get<Org>(`/organizations/${selectedOrg.id}`);
    setSelectedOrg(updated);
    setOrgs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Team</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Organizations</h1>
        <p className="text-slate-500 text-sm mt-1">Collaborate with your team on brand content.</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl px-5 py-3 flex items-center justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-400 text-sm ml-4">×</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl px-5 py-3 flex items-center justify-between">
          <p className="text-emerald-400 text-sm">{success}</p>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-400 text-sm ml-4">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Org list + create */}
        <div className="space-y-3">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Your orgs</p>
            </div>
            {loading ? (
              <div className="p-3 space-y-2">
                {[0, 1].map((i) => <div key={i} className="h-10 bg-slate-800 rounded animate-pulse" />)}
              </div>
            ) : orgs.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-slate-600 text-sm">No organizations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {orgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrg(o)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedOrg?.id === o.id ? 'bg-blue-900/20' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <p className="text-slate-200 text-sm font-medium">{o.name}</p>
                    <p className="text-slate-600 text-xs mt-0.5">{o.members.length} member{o.members.length !== 1 ? 's' : ''}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create org */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-2">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">New organization</p>
            <input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Organization name"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newOrgName.trim()}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>

        {/* Org detail */}
        {selectedOrg && (
          <div className="lg:col-span-2 space-y-4">
            {/* Members */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="text-white text-sm font-semibold">{selectedOrg.name} — Members</h2>
              </div>
              <div className="divide-y divide-slate-800/60">
                {selectedOrg.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                    {m.user.profilePictureUrl ? (
                      <img src={m.user.profilePictureUrl} alt={m.user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-slate-500 text-xs font-bold">{m.user.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm font-medium truncate">{m.user.name}</p>
                      <p className="text-slate-600 text-xs truncate">{m.user.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ROLE_COLORS[m.role]}`}>
                      {m.role}
                    </span>
                    {m.role !== 'OWNER' && (
                      <button
                        onClick={() => handleRemoveMember(m.userId)}
                        className="text-slate-700 hover:text-red-400 text-sm transition-colors ml-1"
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invite */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
              <h3 className="text-white text-sm font-semibold">Invite member</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  type="email"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'EDITOR' | 'VIEWER')}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                >
                  {inviting ? 'Sending…' : 'Send invite'}
                </button>
              </div>

              {/* Pending invites */}
              {selectedOrg.invites.length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-slate-600 text-xs font-medium uppercase tracking-wider">Pending invites</p>
                  {selectedOrg.invites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 bg-slate-800/60 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-sm truncate">{inv.email}</p>
                        <p className="text-slate-600 text-xs">
                          {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        className="text-slate-600 hover:text-red-400 text-sm transition-colors"
                        title="Cancel invite"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
