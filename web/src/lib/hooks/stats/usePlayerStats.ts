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

interface LastMinuteLarryEntry {
  user_id: string;
  display_name: string;
  last_minute_picks: number;
  total_picks: number;
  ratio: number;
}

interface LastMinuteLarryResponse {
  leaderboard: LastMinuteLarryEntry[];
}

interface EarlyBirdEntry {
  user_id: string;
  display_name: string;
  early_picks: number;
  total_picks: number;
  ratio: number;
}

interface EarlyBirdResponse {
  leaderboard: EarlyBirdEntry[];
}

interface SubmissionSpeedEntry {
  user_id: string;
  display_name: string;
  avg_hours_to_submit: number;
  fastest_submission: number;
  slowest_submission: number;
}

interface SubmissionSpeedResponse {
  leaderboard: SubmissionSpeedEntry[];
}

interface SubmissionTimingEntry {
  user_id: string;
  display_name: string;
  first_hour_picks?: number;
  last_hour_picks?: number;
  total_picks: number;
  ratio: number;
}

interface SubmissionTimingResponse {
  early_birds: SubmissionTimingEntry[];
  procrastinators: SubmissionTimingEntry[];
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

  // Stat 4: Last-Minute Larry
  const lastMinuteLarryQuery = useQuery({
    queryKey: ['stats', 'last-minute-larry'],
    queryFn: async () => {
      const response = await api<{ data: LastMinuteLarryResponse }>('/stats/last-minute-larry');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Stat 5: Early Bird
  const earlyBirdQuery = useQuery({
    queryKey: ['stats', 'early-bird'],
    queryFn: async () => {
      const response = await api<{ data: EarlyBirdResponse }>('/stats/early-bird');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Stat 27: Submission Speed
  const submissionSpeedQuery = useQuery({
    queryKey: ['stats', 'submission-speed'],
    queryFn: async () => {
      const response = await api<{ data: SubmissionSpeedResponse }>('/stats/submission-speed');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Stat 24: Submission Timing
  const submissionTimingQuery = useQuery({
    queryKey: ['stats', 'submission-timing'],
    queryFn: async () => {
      const response = await api<{ data: SubmissionTimingResponse }>('/stats/submission-timing');
      if (response.error) throw new Error(response.error);
      return response.data?.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    mostLeaguesQuery.isLoading ||
    lastMinuteLarryQuery.isLoading ||
    earlyBirdQuery.isLoading ||
    submissionSpeedQuery.isLoading ||
    submissionTimingQuery.isLoading;

  const error =
    mostLeaguesQuery.error?.message ||
    lastMinuteLarryQuery.error?.message ||
    earlyBirdQuery.error?.message ||
    submissionSpeedQuery.error?.message ||
    submissionTimingQuery.error?.message ||
    null;

  return {
    mostLeagues: mostLeaguesQuery.data,
    lastMinuteLarry: lastMinuteLarryQuery.data,
    earlyBird: earlyBirdQuery.data,
    submissionSpeed: submissionSpeedQuery.data,
    submissionTiming: submissionTimingQuery.data,
    isLoading,
    error,
  };
}
