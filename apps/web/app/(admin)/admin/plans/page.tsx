'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api-client';
import type { Plan } from '@synapse/types';

interface EditForm {
  displayName: string;
  monthlyTokenLimit: number;
  priceInr: number;
  isActive: boolean;
  razorpayPlanId: string;
  stripePriceId: string;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({
    displayName: '', monthlyTokenLimit: 0, priceInr: 0,
    isActive: true, razorpayPlanId: '', stripePriceId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Plan[]>('/admin/plans').then(setPlans).finally(() => setLoading(false));
  }, []);

  function startEdit(plan: Plan) {
    setEditing(plan.id);
    setError(null);
    setForm({
      displayName: plan.displayName,
      monthlyTokenLimit: plan.monthlyTokenLimit,
      priceInr: plan.priceInr,
      isActive: plan.isActive,
      razorpayPlanId: plan.razorpayPlanId ?? '',
      stripePriceId: plan.stripePriceId ?? '',
    });
  }

  async function handleSave(planId: string) {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        razorpayPlanId: form.razorpayPlanId.trim() || null,
        stripePriceId: form.stripePriceId.trim() || null,
      };
      const updated = await api.patch<Plan>(`/admin/plans/${planId}`, payload);
      setPlans((ps) => ps.map((p) => p.id === planId ? { ...p, ...updated } : p));
      setEditing(null);
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="text-slate-400 text-xs mb-1 block">{label}</label>
        {children}
      </div>
    );
  }

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors";

  if (loading) {
    return (
      <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Plans</h1>
        <p className="text-slate-400 text-sm mt-1">Manage subscription tiers, token limits, and payment provider IDs.</p>
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
                {error && <p className="text-red-400 text-xs">{error}</p>}

                <Field label="Display name">
                  <input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} className={inputClass} />
                </Field>

                <Field label="Monthly token limit (0 = unlimited)">
                  <input type="number" value={form.monthlyTokenLimit} onChange={(e) => setForm((f) => ({ ...f, monthlyTokenLimit: Number(e.target.value) }))} className={inputClass} />
                </Field>

                <Field label="Price ₹/month">
                  <input type="number" step="0.01" value={form.priceInr} onChange={(e) => setForm((f) => ({ ...f, priceInr: Number(e.target.value) }))} className={inputClass} />
                </Field>

                <div className="pt-1 border-t border-slate-800 space-y-3">
                  <p className="text-slate-600 text-[10px] uppercase tracking-wider">Payment provider IDs</p>

                  <Field label="Razorpay Plan ID">
                    <input
                      value={form.razorpayPlanId}
                      onChange={(e) => setForm((f) => ({ ...f, razorpayPlanId: e.target.value }))}
                      placeholder="plan_xxxxx (from Razorpay dashboard)"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Stripe Price ID">
                    <input
                      value={form.stripePriceId}
                      onChange={(e) => setForm((f) => ({ ...f, stripePriceId: e.target.value }))}
                      placeholder="price_xxxxx (from Stripe dashboard)"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Active">
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-slate-300 text-sm">Plan is available to users</span>
                  </label>
                </Field>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleSave(plan.id)} disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(null)} className="px-4 py-2 border border-slate-700 text-slate-300 text-sm rounded-lg hover:border-slate-600 transition-colors">
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

                {/* Payment provider status */}
                <div className="pt-2 border-t border-slate-800/60 space-y-1">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={plan.razorpayPlanId ? 'text-green-500' : 'text-slate-700'}>●</span>
                    <span className="text-slate-600">Razorpay: {plan.razorpayPlanId ? plan.razorpayPlanId.slice(0, 16) + '…' : 'not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={plan.stripePriceId ? 'text-green-500' : 'text-slate-700'}>●</span>
                    <span className="text-slate-600">Stripe: {plan.stripePriceId ? plan.stripePriceId.slice(0, 16) + '…' : 'not set'}</span>
                  </div>
                </div>

                <button onClick={() => startEdit(plan)} className="w-full py-2 border border-slate-700 text-slate-300 text-sm rounded-lg hover:border-slate-600 transition-colors">
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
