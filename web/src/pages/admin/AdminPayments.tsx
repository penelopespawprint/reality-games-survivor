import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, Search, Loader2, CreditCard, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function AdminPayments() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refundingId, setRefundingId] = useState<string | null>(null);

  // Fetch all payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('payments')
        .select('*, users(display_name, email), leagues(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Refund mutation
  const refundPayment = useMutation({
    mutationFn: async (paymentId: string) => {
      // In production, this would call Stripe API
      const { error } = await (supabase as any)
        .from('payments')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setRefundingId(null);
    },
  });

  const filteredPayments = payments?.filter((payment: any) => {
    const matchesSearch =
      payment.users?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.users?.email?.toLowerCase().includes(search.toLowerCase()) ||
      payment.leagues?.name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.stripe_payment_intent_id?.includes(search);
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments?.length || 0,
    completed: payments?.filter((p: any) => p.status === 'completed').length || 0,
    refunded: payments?.filter((p: any) => p.status === 'refunded').length || 0,
    pending: payments?.filter((p: any) => p.status === 'pending').length || 0,
    totalRevenue: payments
      ?.filter((p: any) => p.status === 'completed')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0,
    totalRefunded: payments
      ?.filter((p: any) => p.status === 'refunded')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0) || 0,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-amber-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-burgundy-400" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'refunded':
        return 'bg-amber-500/20 text-amber-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-burgundy-500/20 text-burgundy-300';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-gold-500" />
            All Payments
          </h1>
          <p className="text-burgundy-200">{payments?.length || 0} transactions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <p className="text-green-300 text-sm mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-green-400">${stats.totalRevenue.toFixed(2)}</p>
          <p className="text-green-300/60 text-sm">{stats.completed} payments</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-300 text-sm mb-1">Total Refunded</p>
          <p className="text-2xl font-bold text-amber-400">${stats.totalRefunded.toFixed(2)}</p>
          <p className="text-amber-300/60 text-sm">{stats.refunded} refunds</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
          <p className="text-xl font-bold text-white">{stats.total}</p>
          <p className="text-burgundy-300 text-xs">Total</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-400">{stats.completed}</p>
          <p className="text-burgundy-300 text-xs">Completed</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-amber-400">{stats.refunded}</p>
          <p className="text-burgundy-300 text-xs">Refunded</p>
        </div>
        <div className="bg-burgundy-500/10 border border-burgundy-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-burgundy-300">{stats.pending}</p>
          <p className="text-burgundy-300 text-xs">Pending</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-burgundy-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments..."
            className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Payments List */}
      <div className="space-y-3">
        {filteredPayments?.map((payment: any) => (
          <div
            key={payment.id}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-medium">{payment.users?.display_name}</h3>
                <p className="text-burgundy-300 text-sm">{payment.users?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">${parseFloat(payment.amount).toFixed(2)}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs inline-flex items-center gap-1 ${getStatusBadgeClass(payment.status)}`}>
                  {getStatusIcon(payment.status)}
                  {payment.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-burgundy-300 mb-3">
              <div>
                <span className="text-burgundy-400">League:</span>{' '}
                <span>{payment.leagues?.name}</span>
              </div>
              <div>
                <span className="text-burgundy-400">Date:</span>{' '}
                <span>{new Date(payment.created_at).toLocaleDateString()}</span>
              </div>
              {payment.stripe_payment_intent_id && (
                <div className="col-span-2">
                  <span className="text-burgundy-400">Stripe ID:</span>{' '}
                  <span className="font-mono text-xs">{payment.stripe_payment_intent_id}</span>
                </div>
              )}
            </div>

            {payment.status === 'completed' && (
              <div className="flex gap-2">
                {refundingId === payment.id ? (
                  <>
                    <button
                      onClick={() => refundPayment.mutate(payment.id)}
                      disabled={refundPayment.isPending}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {refundPayment.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Confirm Refund'
                      )}
                    </button>
                    <button
                      onClick={() => setRefundingId(null)}
                      className="px-4 bg-burgundy-700 hover:bg-burgundy-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setRefundingId(payment.id)}
                    className="flex-1 bg-burgundy-700 hover:bg-burgundy-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Issue Refund
                  </button>
                )}
              </div>
            )}

            {payment.status === 'refunded' && payment.refunded_at && (
              <p className="text-amber-400/60 text-sm">
                Refunded on {new Date(payment.refunded_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}

        {filteredPayments?.length === 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
            <CreditCard className="h-12 w-12 text-burgundy-400 mx-auto mb-4" />
            <p className="text-burgundy-200">No payments found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
