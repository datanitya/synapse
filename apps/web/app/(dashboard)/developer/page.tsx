'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api-client';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewKeyResult {
  key: string;
  prefix: string;
  name: string;
  expiresAt: string | null;
}

export default function DeveloperPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResult | null>(null);
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const data = await api.get<ApiKey[]>('/developer/keys');
      setKeys(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await api.post<NewKeyResult>('/developer/keys', {
        name: name.trim(),
        expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : undefined,
      });
      setNewKey(result);
      setName('');
      setExpiresInDays('');
      await loadKeys();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create key. Developer API requires the BUSINESS plan.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    setRevoking(keyId);
    try {
      await api.delete(`/developer/keys/${keyId}`);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  }

  function handleCopy() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Developer</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">API Keys</h1>
        <p className="text-slate-500 text-sm mt-1">Integrate SYNAPSE into your own tools. Requires BUSINESS plan.</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl px-5 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* New key reveal — shown once */}
      {newKey && (
        <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-5 space-y-3">
          <p className="text-emerald-400 text-sm font-semibold">✓ Key created — copy it now. You won't see it again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-emerald-300 text-sm font-mono break-all">
              {newKey.key}
            </code>
            <button
              onClick={handleCopy}
              className={`shrink-0 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                copied ? 'border-emerald-600 bg-emerald-900/30 text-emerald-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
            I've saved it — dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <h2 className="text-white text-sm font-semibold">Create new key</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. My automation)"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <select
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">No expiry</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            {creating ? 'Creating…' : 'Create key'}
          </button>
        </div>
      </div>

      {/* Key list */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-white text-sm font-semibold">Active keys</h2>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[0, 1].map((i) => <div key={i} className="h-14 bg-slate-800 rounded-lg animate-pulse" />)}
          </div>
        ) : keys.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-slate-600 text-sm">No API keys yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-slate-200 text-sm font-medium">{k.name}</p>
                    <code className="text-slate-600 text-xs font-mono">{k.prefix}…</code>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600">
                    <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                    {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                    {k.expiresAt && <span className="text-amber-600">Expires {new Date(k.expiresAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  disabled={revoking === k.id}
                  className="text-xs px-3 py-1.5 border border-red-900 text-red-400 rounded-lg hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                >
                  {revoking === k.id ? 'Revoking…' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage docs */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
        <h2 className="text-white text-sm font-semibold">Usage</h2>
        <p className="text-slate-500 text-xs">Pass your key in the Authorization header on any SYNAPSE API endpoint.</p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-emerald-300 text-xs font-mono overflow-x-auto">{`curl https://api.synapse.app/api/trends \\
  -H "Authorization: Bearer sk_live_your_key_here"`}</pre>
        <p className="text-slate-600 text-xs">Base URL: <code className="text-slate-400">https://api.synapse.app/api</code></p>
      </div>
    </div>
  );
}
