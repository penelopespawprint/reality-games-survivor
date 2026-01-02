/**
 * Castaway Stats Hook
 *
 * Fetches all 5 castaway performance stats.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ScoringEfficiencyEntry {
  castaway_id: string;
  name: string;
  total_points: number;
  episodes_played: number;
  efficiency: number;
}

interface TribeScoringEntry {
  tribe_id?: string;
  name: string;
  color?: string;
  total_points: number;
  castaway_count: number;
  avg_per_castaway: number;
}

interface ScoringEfficiencyResponse {
  leaderboard: ScoringEfficiencyEntry[];
}

interface TribeScoringResponse {
  tribes: TribeScoringEntry[];
}

export function useCastawayStats() {
  // Stat 19: Scoring Efficiency
  const scoringEfficiencyQuery = useQuery({
    queryKey: ['stats', 'scoring-efficiency'],
    queryFn: async () => {
      const response = await api<{ data: ScoringEfficiencyResponse }>('/stats/scoring-efficiency');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Stat 23: Tribe Scoring
  const tribeScoringQuery = useQuery({
    queryKey: ['stats', 'tribe-scoring'],
    queryFn: async () => {
      const response = await api<{ data: TribeScoringResponse }>('/stats/tribe-scoring');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = scoringEfficiencyQuery.isLoading || tribeScoringQuery.isLoading;
  const error = scoringEfficiencyQuery.error?.message || tribeScoringQuery.error?.message || null;

  return {
    scoringEfficiency: scoringEfficiencyQuery.data,
    tribeScoring: tribeScoringQuery.data,
    isLoading,
    error,
  };
}
