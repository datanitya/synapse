'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api-client';

interface PaymentLog {
  id: string;
  razorpayPaymentId: string | null;
  razorpaySubscriptionId: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  amountPaise: number;
  currency: string;
  status: string;
  method: string | null;
  planDisplayName: string | null;
  event: string;
  createdAt: string;
}

interface PaymentsStats {
  totalRevenueInr: number;
  monthRevenueInr: number;
  totalTransactions: number;
  monthTransactions: number;
  failedPayments: number;
}

interface PaymentsResponse {
  payments: PaymentLog[];
  total: number;
  page: number;
  pages: number;
  stats: PaymentsStats;
}

const METHOD_LABEL: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
  emi: 'EMI',
};

const EVENT_LABEL: Record<string, string> = {
  'subscription.charged': 'Renewal',
  'subscription.activated': 'First payment',
  'payment.failed': 'Failed',
};

function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'captured'
      ? 'bg-green-900/40 text-green-400 border-green-800/30'
      : status === 'failed'
      ? 'bg-red-900/40 text-red-400 border-red-800/30'
      : 'bg-slate-800 text-slate-400 border-slate-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${style}`}>
      {status === 'captured' ? 'Paid' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    api
      .get<PaymentsResponse>(`/admin/payments?page=${page}&limit=20`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [page]);

  const stats = data?.stats;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Payments</h1>
        <p className="text-slate-400 text-sm mt-1">All Razorpay transactions received via webhook</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total revenue"
            value={`₹${stats.totalRevenueInr.toLocaleString()}`}
            sub={`${stats.totalTransactions} transactions`}
          />
          <StatCard
            label="This month"
            value={`₹${stats.monthRevenueInr.toLocaleString()}`}
            sub={`${stats.monthTransactions} transactions`}
          />
          <StatCard
            label="Total transactions"
            value={stats.totalTransactions.toString()}
          />
          <StatCard
            label="Failed payments"
            value={stats.failedPayments.toString()}
            sub={stats.failedPayments > 0 ? 'needs attention' : 'all clear'}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-5 py-3 font-medium">Date</th>
              <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">User</th>
              <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium hidden md:table-cell">Plan</th>
              <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">Amount</th>
              <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium hidden sm:table-cell">Method</th>
              <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium hidden lg:table-cell">Type</th>
              <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td colSpan={7} className="px-5 py-3">
                    <div className="h-5 bg-slate-800 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : (data?.payments ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500 text-sm">
                  No payments yet. Once users subscribe via Razorpay, transactions will appear here.
                </td>
              </tr>
            ) : (
              (data?.payments ?? []).map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    <span className="block text-slate-600">
                      {new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {p.userName ? (
                      <div>
                        <p className="text-white font-medium text-sm">{p.userName}</p>
                        <p className="text-slate-500 text-xs">{p.userEmail}</p>
                      </div>
                    ) : p.userEmail ? (
                      <p className="text-slate-300 text-sm">{p.userEmail}</p>
                    ) : (
                      <p className="text-slate-600 text-xs">Unknown</p>
                    )}
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-slate-300 text-sm">{p.planDisplayName ?? '—'}</span>
                  </td>

                  <td className="px-4 py-3">
                    {p.amountPaise > 0 ? (
                      <span className={`font-semibold text-sm ${p.status === 'captured' ? 'text-green-400' : 'text-red-400'}`}>
                        ₹{(p.amountPaise / 100).toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-slate-400 text-xs">
                      {p.method ? (METHOD_LABEL[p.method] ?? p.method) : '—'}
                    </span>
                  </td>

                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-slate-400 text-xs">
                      {EVENT_LABEL[p.event] ?? p.event}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 text-xs">
            Page {data.page} of {data.pages} — {data.total} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg text-xs hover:border-slate-600 disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === data.pages}
              className="px-3 py-1.5 border border-slate-700 text-slate-300 rounded-lg text-xs hover:border-slate-600 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <p className="text-slate-600 text-xs">
        Amounts shown are captured from Razorpay webhook events. Subscription ID is stored per user for reconciliation.
      </p>
    </div>
  );
}
