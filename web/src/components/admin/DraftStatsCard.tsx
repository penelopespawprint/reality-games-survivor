import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface DraftStats {
  pending: number;
  inProgress: number;
  completed: number;
  total: number;
  awaitingDraft: number;
}

export function DraftStatsCard() {
  const { data: draftStats, isLoading } = useQuery<DraftStats>({
    queryKey: ['adminDraftStats'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/admin/dashboard/draft-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch draft stats');
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

  if (!draftStats) return null;

  const completionRate =
    draftStats.total > 0 ? Math.round((draftStats.completed / draftStats.total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h2 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-burgundy-500" />
        Draft Status
      </h2>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-neutral-600">Draft Completion</span>
          <span className="font-medium text-neutral-800">{completionRate}%</span>
        </div>
        <div className="w-full bg-cream-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-burgundy-500 to-orange-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{draftStats.pending}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">{draftStats.inProgress}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-700 font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{draftStats.completed}</p>
        </div>

        <div className="bg-orange-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <span className="text-xs text-orange-700 font-medium">Ready to Draft</span>
          </div>
          <p className="text-2xl font-bold text-orange-800">{draftStats.awaitingDraft}</p>
          <p className="text-xs text-orange-600">2+ members</p>
        </div>
      </div>
    </div>
  );
}
