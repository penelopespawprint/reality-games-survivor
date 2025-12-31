import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, Brain, Trophy, Target, Flame } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface TriviaStats {
  totalAttempts: number;
  completedTrivia: number;
  inProgress: number;
  completionRate: number;
  avgQuestionsAnswered: number;
  avgQuestionsCorrect: number;
}

export function TriviaStatsCard() {
  const { data: triviaStats, isLoading } = useQuery<TriviaStats>({
    queryKey: ['adminTriviaStats'],
    queryFn: async () => {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(`${API_URL}/api/admin/dashboard/trivia-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch trivia stats');
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

  if (!triviaStats) return null;

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
      <h2 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
        <Brain className="h-5 w-5 text-purple-600" />
        Trivia Engagement
      </h2>

      {/* Completion rate highlight */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 mb-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90 mb-1">Completion Rate</p>
            <p className="text-3xl font-bold">{triviaStats.completionRate}%</p>
          </div>
          <Trophy className="h-10 w-10 opacity-75" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-purple-700 font-medium">Total Attempts</span>
          </div>
          <p className="text-2xl font-bold text-purple-800">{triviaStats.totalAttempts}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-700 font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{triviaStats.completedTrivia}</p>
        </div>

        <div className="bg-amber-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{triviaStats.inProgress}</p>
        </div>

        <div className="bg-orange-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-orange-600" />
            <span className="text-xs text-orange-700 font-medium">Avg. Correct</span>
          </div>
          <p className="text-2xl font-bold text-orange-800">{triviaStats.avgQuestionsCorrect}</p>
          <p className="text-xs text-orange-600">out of 24</p>
        </div>
      </div>

      {/* Average progress */}
      <div className="border-t border-cream-200 pt-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-neutral-600">Avg. Questions Answered</span>
          <span className="font-medium text-neutral-800">
            {triviaStats.avgQuestionsAnswered} / 24
          </span>
        </div>
        <div className="w-full bg-cream-200 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(triviaStats.avgQuestionsAnswered / 24) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
