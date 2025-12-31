import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, Globe, Lock, DollarSign, Gift } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface LeagueBreakdown {
  byVisibility: {
    public: number;
    private: number;
  };
  byPayment: {
    paid: number;
    free: number;
  };
}

export function LeagueBreakdownCard() {
  const { data: leagueBreakdown, isLoading } = useQuery<LeagueBreakdown>({
    queryKey: ['adminLeagueBreakdown'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/admin/dashboard/league-breakdown`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch league breakdown');
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

  if (!leagueBreakdown) return null;

  const totalLeagues = leagueBreakdown.byVisibility.public + leagueBreakdown.byVisibility.private;
  const publicPct =
    totalLeagues > 0 ? Math.round((leagueBreakdown.byVisibility.public / totalLeagues) * 100) : 0;
  const paidPct =
    totalLeagues > 0 ? Math.round((leagueBreakdown.byPayment.paid / totalLeagues) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h2 className="text-lg font-display font-bold text-neutral-800 mb-4">League Breakdown</h2>

      {/* Visibility breakdown */}
      <div className="mb-6">
        <p className="text-sm font-medium text-neutral-600 mb-3">By Visibility</p>
        <div className="flex gap-3 mb-2">
          <div className="flex-1 bg-teal-50 rounded-lg p-3 border border-teal-200">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-700">Public</span>
            </div>
            <p className="text-2xl font-bold text-teal-800">
              {leagueBreakdown.byVisibility.public}
            </p>
          </div>
          <div className="flex-1 bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Private</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">
              {leagueBreakdown.byVisibility.private}
            </p>
          </div>
        </div>
        <div className="w-full bg-cream-200 rounded-full h-2.5">
          <div
            className="bg-teal-500 h-2.5 rounded-l-full transition-all duration-500"
            style={{ width: `${publicPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-neutral-500 mt-1">
          <span>{publicPct}% Public</span>
          <span>{100 - publicPct}% Private</span>
        </div>
      </div>

      {/* Payment breakdown */}
      <div>
        <p className="text-sm font-medium text-neutral-600 mb-3">By Payment</p>
        <div className="flex gap-3 mb-2">
          <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Paid</span>
            </div>
            <p className="text-2xl font-bold text-green-800">{leagueBreakdown.byPayment.paid}</p>
          </div>
          <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Free</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{leagueBreakdown.byPayment.free}</p>
          </div>
        </div>
        <div className="w-full bg-cream-200 rounded-full h-2.5">
          <div
            className="bg-green-500 h-2.5 rounded-l-full transition-all duration-500"
            style={{ width: `${paidPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-neutral-500 mt-1">
          <span>{paidPct}% Paid</span>
          <span>{100 - paidPct}% Free</span>
        </div>
      </div>
    </div>
  );
}
