import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, DollarSign, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PaymentHistory() {
  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => {
      if (!currentUser) return [];
      const { data, error } = await (supabase as any)
        .from('payments')
        .select('*, leagues(name)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'refunded':
        return <XCircle className="h-5 w-5 text-amber-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-burgundy-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'refunded':
        return 'Refunded';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  const totalSpent = payments
    ?.filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

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
          to="/profile"
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-gold-500" />
            Payment History
          </h1>
          <p className="text-burgundy-200">Your league payments</p>
        </div>
      </div>

      {/* Total Spent */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-burgundy-200 text-sm">Total Spent</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="w-12 h-12 bg-gold-500/20 rounded-full flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-gold-500" />
          </div>
        </div>
        <p className="text-burgundy-300 text-sm mt-2">
          {payments?.length || 0} transaction{payments?.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {payments?.map((payment: any) => (
          <div
            key={payment.id}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-white font-medium">{payment.leagues?.name}</h3>
                <p className="text-burgundy-300 text-sm">League Entry Fee</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${
                  payment.status === 'refunded' ? 'text-amber-400' : 'text-white'
                }`}>
                  {payment.status === 'refunded' ? '-' : ''}{formatCurrency(payment.amount, payment.currency)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-burgundy-700">
              <div className="flex items-center gap-2">
                {getStatusIcon(payment.status)}
                <span className={`text-sm ${
                  payment.status === 'completed' ? 'text-green-400' :
                  payment.status === 'refunded' ? 'text-amber-400' :
                  payment.status === 'failed' ? 'text-red-400' :
                  'text-burgundy-300'
                }`}>
                  {getStatusText(payment.status)}
                </span>
              </div>
              <p className="text-burgundy-400 text-sm">{formatDate(payment.created_at)}</p>
            </div>

            {payment.status === 'refunded' && payment.refunded_at && (
              <p className="text-amber-400/80 text-xs mt-2">
                Refunded on {formatDate(payment.refunded_at)}
              </p>
            )}
          </div>
        ))}

        {payments?.length === 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
            <CreditCard className="h-12 w-12 text-burgundy-400 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">No Payments Yet</h3>
            <p className="text-burgundy-200 text-sm">
              Join a paid league to see your payment history here.
            </p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-burgundy-800/50 rounded-xl">
        <p className="text-burgundy-200 text-sm">
          <strong className="text-white">Questions about a payment?</strong> Contact us at{' '}
          <a href="mailto:support@realitygamesfantasyleague.com" className="text-gold-500">
            support@realitygamesfantasyleague.com
          </a>
        </p>
      </div>
    </div>
  );
}
