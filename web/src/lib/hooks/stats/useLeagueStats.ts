/**
 * League Stats Hook
 *
 * Fetches all 7 league and platform stats.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LeagueScoringEntry {
  league_id: string;
  name: string;
  total_points: number;
  member_count: number;
  avg_per_member: number;
}

interface LeagueScoringResponse {
  leaderboard: LeagueScoringEntry[];
}

interface ActivityByDayEntry {
  day: number;
  picks: number;
  messages: number;
  total: number;
}

interface ActivityByDayResponse {
  days: ActivityByDayEntry[];
}

interface ActivityByHourEntry {
  hour: number;
  picks: number;
  messages: number;
  total: number;
}

interface ActivityByHourResponse {
  hours: ActivityByHourEntry[];
}

export function useLeagueStats() {
  // Stat 22: League Scoring
  const leagueScoringQuery = useQuery({
    queryKey: ['stats', 'league-scoring'],
    queryFn: async () => {
      const response = await api<{ data: LeagueScoringResponse }>('/stats/league-scoring');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Stat 25: Activity by Day
  const activityByDayQuery = useQuery({
    queryKey: ['stats', 'activity-by-day'],
    queryFn: async () => {
      const response = await api<{ data: ActivityByDayResponse }>('/stats/activity-by-day');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Stat 26: Activity by Hour
  const activityByHourQuery = useQuery({
    queryKey: ['stats', 'activity-by-hour'],
    queryFn: async () => {
      const response = await api<{ data: ActivityByHourResponse }>('/stats/activity-by-hour');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    leagueScoringQuery.isLoading || activityByDayQuery.isLoading || activityByHourQuery.isLoading;

  const error =
    leagueScoringQuery.error?.message ||
    activityByDayQuery.error?.message ||
    activityByHourQuery.error?.message ||
    null;

  return {
    leagueScoring: leagueScoringQuery.data,
    activityByDay: activityByDayQuery.data,
    activityByHour: activityByHourQuery.data,
    isLoading,
    error,
  };
}
