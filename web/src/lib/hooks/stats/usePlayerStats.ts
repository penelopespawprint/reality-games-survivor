/**
 * Player Stats Hook
 *
 * Fetches all 15 player performance stats.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface MostLeaguesEntry {
  user_id: string;
  display_name: string;
  league_count: number;
}

interface MostLeaguesResponse {
  leaderboard: MostLeaguesEntry[];
  distribution?: { bucket: string; count: number }[];
}

export function usePlayerStats() {
  // Stat 13: Most Leagues Joined
  const mostLeaguesQuery = useQuery({
    queryKey: ['stats', 'most-leagues'],
    queryFn: async () => {
      const response = await api<{ data: MostLeaguesResponse }>('/stats/most-leagues');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    mostLeagues: mostLeaguesQuery.data,
    isLoading: mostLeaguesQuery.isLoading,
    error: mostLeaguesQuery.error?.message || null,
  };
}
