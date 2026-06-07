'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api-client';

interface Plan {
  id: string;
  tier: string;
  displayName: string;
  monthlyTokenLimit: number;
  priceInr: number;
  features: string[];
  isActive: boolean;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Plan[]>('/admin/plans').then(setPlans).finally(() => setLoading(false));
  }, []);

  function startEdit(plan: Plan) {
    setEditing(plan.id);
    setForm({ displayName: plan.displayName, monthlyTokenLimit: plan.monthlyTokenLimit, priceInr: plan.priceInr });
  }

  async function handleSave(planId: string) {
    setSaving(true);
    try {
      const updated = await api.patch<Plan>(`/admin/plans/${planId}`, form);
      setPlans((ps) => ps.map((p) => p.id === planId ? { ...p, ...updated } : p));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Plans</h1>
        <p className="text-slate-400 text-sm mt-1">Manage subscription tiers and token limits</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{plan.tier}</span>
              {!plan.isActive && <span className="text-xs text-red-400">Inactive</span>}
            </div>

            {editing === plan.id ? (
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Display name</label>
                  <input
                    value={form.displayName ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Monthly token limit (0 = unlimited)</label>
                  <input
                    type="number"
                    value={form.monthlyTokenLimit ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, monthlyTokenLimit: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Price ₹/month</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.priceInr ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, priceInr: Number(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(plan.id)}
                    disabled={saving}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-4 py-2 border border-slate-700 text-slate-300 text-sm rounded-lg hover:border-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-white font-bold text-xl">{plan.displayName}</p>
                  <p className="text-slate-400 text-sm">{plan.priceInr === 0 ? 'Free' : `₹${plan.priceInr}/mo`}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {plan.monthlyTokenLimit === 0 ? 'Unlimited tokens' : `${plan.monthlyTokenLimit.toLocaleString()} tokens/mo`}
                  </p>
                </div>
                <ul className="space-y-1">
                  {(plan.features as string[]).map((f, i) => (
                    <li key={i} className="text-slate-400 text-xs flex items-start gap-1.5">
                      <span className="text-green-400 shrink-0 mt-0.5">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => startEdit(plan)}
                  className="w-full py-2 border border-slate-700 text-slate-300 text-sm rounded-lg hover:border-slate-600 transition-colors"
                >
                  Edit plan
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
