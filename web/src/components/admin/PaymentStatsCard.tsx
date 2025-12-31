import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, DollarSign, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface PaymentStats {
  totalPayments: number;
  byStatus: {
    completed: number;
    pending: number;
    failed: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime: number;
  };
}

export function PaymentStatsCard() {
  const { data: paymentStats, isLoading } = useQuery<PaymentStats>({
    queryKey: ['adminPaymentStats'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/admin/dashboard/payment-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch payment stats');
      return response.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-burgundy-500" />
        </div>
      </div>
    );
  }

  if (!paymentStats) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h2 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-green-600" />
        Revenue & Payments
      </h2>

      {/* All-time revenue highlight */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 mb-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium opacity-90">All-Time Revenue</span>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(paymentStats.revenue.allTime)}</p>
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-xs text-green-700 mb-1">Today</p>
          <p className="text-lg font-bold text-green-800">
            {formatCurrency(paymentStats.revenue.today)}
          </p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-xs text-green-700 mb-1">This Week</p>
          <p className="text-lg font-bold text-green-800">
            {formatCurrency(paymentStats.revenue.thisWeek)}
          </p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-xs text-green-700 mb-1">This Month</p>
          <p className="text-lg font-bold text-green-800">
            {formatCurrency(paymentStats.revenue.thisMonth)}
          </p>
        </div>
      </div>

      {/* Payment status breakdown */}
      <div className="border-t border-cream-200 pt-4">
        <p className="text-sm font-medium text-neutral-600 mb-3">Payment Status</p>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-neutral-600">
              {paymentStats.byStatus.completed} completed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-neutral-600">
              {paymentStats.byStatus.pending} pending
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-neutral-600">{paymentStats.byStatus.failed} failed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
