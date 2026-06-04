'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { usePostHog } from 'posthog-js/react';
import { api } from '../../../lib/api-client';
import type { TokenUsageStats } from '@synapse/types';

interface Plan {
  id: string;
  tier: string;
  displayName: string;
  monthlyTokenLimit: number;
  priceInr: number;
  features: string[];
}

interface PlanStatus {
  plan: Plan | null;
  tokensUsed: number;
  monthlyLimit: number;
  isUnlimited: boolean;
  percentUsed: number;
}

interface CreateSubscriptionResponse {
  subscriptionId?: string;
  keyId?: string;
  free?: boolean;
}

const INR_RATE = 84;

const PROVIDER_COLORS: Record<string, string> = {
  CLAUDE: 'bg-orange-900/40 text-orange-400 border-orange-800/30',
  GEMINI: 'bg-blue-900/40 text-blue-400 border-blue-800/30',
  OPENAI: 'bg-green-900/40 text-green-400 border-green-800/30',
};

const PURPOSE_LABELS: Record<string, { label: string; icon: string }> = {
  generation:       { label: 'Post generation',  icon: '✍' },
  blog_generation:  { label: 'Blog generation',  icon: '📄' },
  image_generation: { label: 'Image generation', icon: '🖼' },
  categorization:   { label: 'Trend analysis',   icon: '📡' },
};

function fmtUsd(n: number) {
  return '$' + (n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2));
}

function fmtInr(n: number) {
  const inr = n * INR_RATE;
  return '₹' + (inr < 1 && inr > 0 ? inr.toFixed(2) : Math.round(inr).toLocaleString());
}

function formatMonth(ym: string) {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

export default function BillingPage() {
  const posthog = usePostHog();
  const [stats, setStats] = useState<TokenUsageStats | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<TokenUsageStats>('/usage/stats').catch(() => null),
      api.get<PlanStatus>('/plans/status').catch(() => null),
      api.get<Plan[]>('/plans').catch(() => [] as Plan[]),
    ]).then(([s, ps, plans]) => {
      setStats(s);
      setPlanStatus(ps);
      setAvailablePlans(plans ?? []);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSubscribe(planId: string) {
    const targetPlan = availablePlans.find((p) => p.id === planId);
    posthog?.capture('upgrade_clicked', {
      fromPlan: planStatus?.plan?.displayName ?? 'Free',
      toPlan: targetPlan?.displayName ?? planId,
    });

    setSubscribing(planId);
    setSubscribeError(null);
    try {
      const res = await api.post<CreateSubscriptionResponse>('/billing/create-subscription', { planId });

      // FREE plan downgrade — no checkout needed
      if (res.free) {
        const ps = await api.get<PlanStatus>('/plans/status');
        setPlanStatus(ps);
        return;
      }

      if (!res.subscriptionId || !res.keyId) return;

      // Open Razorpay checkout
      const Razorpay = (window as unknown as { Razorpay: new (opts: object) => { open(): void } }).Razorpay;
      const rzp = new Razorpay({
        key: res.keyId,
        subscription_id: res.subscriptionId,
        name: 'SYNAPSE',
        description: `${targetPlan?.displayName ?? 'Plan'} — ₹${targetPlan?.priceInr ?? ''}/mo`,
        theme: { color: '#2563eb' },
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          try {
            await api.post('/billing/verify-payment', {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySubscriptionId: response.razorpay_subscription_id,
              razorpaySignature: response.razorpay_signature,
            });
          } catch {
            // Webhook will also activate the plan — safe to ignore verify errors
          }
          const ps = await api.get<PlanStatus>('/plans/status');
          setPlanStatus(ps);
          posthog?.capture('subscription_activated', { plan: targetPlan?.displayName });
        },
      });
      rzp.open();
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubscribing(null);
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel your subscription? You will be moved to the Free plan.')) return;
    setSubscribing('cancel');
    try {
      await api.post('/billing/cancel');
      const ps = await api.get<PlanStatus>('/plans/status');
      setPlanStatus(ps);
    } finally {
      setSubscribing(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />
        ))}
      </div>
    );
  }

  const cur = stats?.currentMonth;

  return (
    <>
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Account</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Billing</h1>
        <p className="text-slate-400 text-sm mt-1">Your plan, token usage, and cost breakdown.</p>
      </div>

      {/* Subscription error banner */}
      {subscribeError && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-red-400 shrink-0 mt-0.5">✕</span>
          <p className="text-red-300 text-sm">{subscribeError}</p>
          <button onClick={() => setSubscribeError(null)} className="ml-auto text-red-500 hover:text-red-400 text-xs shrink-0">Dismiss</button>
        </div>
      )}

      {/* Current plan card */}
      {planStatus && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white font-semibold">
                {planStatus.plan ? planStatus.plan.displayName : 'Free'} Plan
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                {planStatus.isUnlimited ? 'Unlimited tokens' : `${planStatus.monthlyLimit.toLocaleString()} tokens / month`}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              planStatus.plan?.tier === 'BUSINESS' ? 'bg-purple-900/40 text-purple-400 border-purple-800/30' :
              planStatus.plan?.tier === 'PRO' ? 'bg-blue-900/40 text-blue-400 border-blue-800/30' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {planStatus.plan?.tier ?? 'FREE'}
            </span>
          </div>

          {!planStatus.isUnlimited && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{planStatus.tokensUsed.toLocaleString()} used</span>
                <span className="text-slate-500">{planStatus.percentUsed}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${planStatus.percentUsed >= 90 ? 'bg-red-500' : planStatus.percentUsed >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                  style={{ width: `${planStatus.percentUsed}%` }}
                />
              </div>
              <p className="text-slate-600 text-xs">{(planStatus.monthlyLimit - planStatus.tokensUsed).toLocaleString()} tokens remaining this month</p>
            </div>
          )}

          {planStatus.plan && planStatus.plan.tier !== 'FREE' && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleCancel}
                disabled={subscribing === 'cancel'}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
              >
                {subscribing === 'cancel' ? 'Cancelling…' : 'Cancel subscription'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plan picker */}
      {availablePlans.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
          <h2 className="text-white font-semibold">Choose a plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {availablePlans.map((plan) => {
              const isCurrent = planStatus?.plan?.id === plan.id;
              return (
                <div key={plan.id} className={`rounded-xl border p-4 space-y-3 ${isCurrent ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700 bg-slate-800/40'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold">{plan.displayName}</p>
                    {isCurrent && <span className="text-xs text-blue-400 font-medium">Current</span>}
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {plan.priceInr === 0 ? 'Free' : `₹${plan.priceInr}`}
                    {plan.priceInr > 0 && <span className="text-sm font-normal text-slate-400">/mo</span>}
                  </p>
                  <ul className="space-y-1">
                    {(plan.features as string[]).map((f, i) => (
                      <li key={i} className="text-slate-400 text-xs flex items-start gap-1.5">
                        <span className="text-green-400 mt-0.5 shrink-0">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribing === plan.id}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {subscribing === plan.id ? 'Switching…' : `Switch to ${plan.displayName}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current month summary */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Current month</h2>
          {cur && <span className="text-slate-500 text-xs uppercase tracking-wider">{formatMonth(cur.month)}</span>}
        </div>

        {!cur || cur.total === 0 ? (
          <p className="text-slate-500 text-sm">No AI usage recorded yet this month.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-500 text-xs mb-2">Tokens used</p>
              <p className="text-2xl font-bold text-white leading-none">{cur.total.toLocaleString()}</p>
              <p className="text-slate-600 text-xs mt-1.5">all sources</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-500 text-xs mb-2">Estimated cost</p>
              <p className="text-2xl font-bold text-white leading-none">{fmtUsd(cur.totalCostUsd)}</p>
              <p className="text-slate-600 text-xs mt-1.5">USD</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-500 text-xs mb-2">Estimated cost</p>
              <p className="text-2xl font-bold text-white leading-none">{fmtInr(cur.totalCostUsd)}</p>
              <p className="text-slate-600 text-xs mt-1.5">INR @ ₹{INR_RATE}/USD</p>
            </div>
          </div>
        )}
      </div>

      {/* By feature */}
      {cur && Object.keys(cur.byPurpose).length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
          <h2 className="text-white font-semibold">By feature</h2>
          <div className="space-y-2">
            {(Object.entries(cur.byPurpose) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([purpose, tokens]) => {
                const meta = PURPOSE_LABELS[purpose] ?? { label: purpose, icon: '·' };
                const pct = cur.total > 0 ? Math.round((tokens / cur.total) * 100) : 0;
                return (
                  <div key={purpose} className="flex items-center gap-3">
                    <span className="text-base w-5 text-center shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-300 text-sm">{meta.label}</span>
                        <span className="text-slate-500 text-xs tabular-nums">{tokens.toLocaleString()} tokens · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* By provider */}
      {cur && Object.keys(cur.byProvider).length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
          <h2 className="text-white font-semibold">By AI provider</h2>
          <div className="space-y-2">
            {(Object.entries(cur.byProvider) as [string, number][]).map(([provider, tokens]) => {
              const cost = cur.costByProvider[provider as 'CLAUDE' | 'GEMINI' | 'OPENAI'];
              const pct = cur.total > 0 ? Math.round((tokens / cur.total) * 100) : 0;
              return (
                <div key={provider} className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${PROVIDER_COLORS[provider] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {provider}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300 text-sm">{tokens.toLocaleString()} tokens</span>
                      <span className="text-slate-400 text-xs tabular-nums">{pct}% · {cost !== undefined ? fmtUsd(cost) : '—'}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6-month history */}
      {stats && stats.history.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
          <h2 className="text-white font-semibold">Monthly history</h2>
          <div className="divide-y divide-slate-800">
            {stats.history.map((h) => (
              <div key={h.month} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-slate-300 text-sm">{formatMonth(h.month)}</span>
                <div className="flex items-center gap-5 text-right">
                  <span className="text-slate-500 text-xs">{h.total.toLocaleString()} tokens</span>
                  <span className="text-white text-sm font-medium w-14">{fmtUsd(h.totalCostUsd)}</span>
                  <span className="text-slate-400 text-sm w-16">{fmtInr(h.totalCostUsd)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-slate-600 text-xs text-center pb-4">
        Costs are estimates based on public model pricing. Actual charges depend on your AI provider account.
      </p>
    </div>
    </>
  );
}
