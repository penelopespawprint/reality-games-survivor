/**
 * API Hooks with React Query
 *
 * Custom hooks for data fetching with automatic caching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { queryKeys } from '../config/queryClient';
import { queueRequest } from '../services/offline';

// Types
interface League {
  id: string;
  name: string;
  code: string;
  memberCount: number;
}

interface Castaway {
  id: string;
  name: string;
  number: number;
  tribe: string;
  imageUrl: string;
  eliminated: boolean;
}

interface Week {
  id: string;
  number: number;
  episodeTitle?: string;
  episodeDate?: string;
  picksOpen: boolean;
  scoringComplete: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  totalPoints: number;
  weeklyPoints: number;
}

// ============ LEAGUES ============

export function useLeagues() {
  return useQuery({
    queryKey: queryKeys.leagues,
    queryFn: async () => {
      const response = await api.get<League[]>('/api/leagues/my-leagues');
      return response.data;
    },
  });
}

export function useLeague(leagueId: string) {
  return useQuery({
    queryKey: queryKeys.league(leagueId),
    queryFn: async () => {
      const response = await api.get<League>(`/api/leagues/${leagueId}`);
      return response.data;
    },
    enabled: !!leagueId,
  });
}

export function useLeaderboard(leagueId: string) {
  return useQuery({
    queryKey: queryKeys.leagueLeaderboard(leagueId),
    queryFn: async () => {
      const response = await api.get<LeaderboardEntry[]>(`/api/leagues/${leagueId}/leaderboard`);
      return response.data;
    },
    enabled: !!leagueId,
  });
}

// ============ CASTAWAYS ============

export function useCastaways() {
  return useQuery({
    queryKey: queryKeys.castaways,
    queryFn: async () => {
      const response = await api.get<Castaway[]>('/api/castaways');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // Castaways don't change often
  });
}

// ============ WEEKS ============

export function useWeeks() {
  return useQuery({
    queryKey: queryKeys.weeks,
    queryFn: async () => {
      const response = await api.get<Week[]>('/api/weeks');
      return response.data;
    },
  });
}

export function useActiveWeek() {
  return useQuery({
    queryKey: queryKeys.activeWeek,
    queryFn: async () => {
      const response = await api.get<Week>('/api/weeks/active');
      return response.data;
    },
  });
}

// ============ PICKS ============

interface Pick {
  id: string;
  castawayId: string;
  rank: number;
}

export function usePicks(leagueId: string) {
  return useQuery({
    queryKey: queryKeys.picks(leagueId),
    queryFn: async () => {
      const response = await api.get<Pick[]>(`/api/picks/${leagueId}`);
      return response.data;
    },
    enabled: !!leagueId,
  });
}

export function useSubmitPicks(leagueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (picks: { castawayId: string; rank: number }[]) => {
      try {
        const response = await api.post(`/api/picks/${leagueId}`, { picks });
        return response.data;
      } catch (error: any) {
        // Queue for retry if offline (Skill 27: graceful degradation)
        if (error.message === 'Network Error') {
          await queueRequest('POST', `/api/picks/${leagueId}`, { picks });
          throw new Error('Picks queued for sync when online');
        }
        throw error;
      }
    },
    // Optimistic update: show changes immediately (Skill 27: fast feedback)
    onMutate: async (newPicks) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.picks(leagueId) });
      const previousPicks = queryClient.getQueryData(queryKeys.picks(leagueId));
      queryClient.setQueryData(queryKeys.picks(leagueId),
        newPicks.map((p, i) => ({ id: `temp-${i}`, ...p }))
      );
      return { previousPicks };
    },
    onError: (_err, _newPicks, context) => {
      // Rollback on error
      if (context?.previousPicks) {
        queryClient.setQueryData(queryKeys.picks(leagueId), context.previousPicks);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.picks(leagueId) });
    },
  });
}

// ============ SCORES ============

interface Score {
  castawayId: string;
  castawayName: string;
  points: number;
  breakdown: { action: string; points: number }[];
}

export function useWeeklyScores(weekId: string) {
  return useQuery({
    queryKey: queryKeys.scores(weekId),
    queryFn: async () => {
      const response = await api.get<Score[]>(`/api/scores/week/${weekId}`);
      return response.data;
    },
    enabled: !!weekId,
  });
}

// ============ JOIN LEAGUE ============

export function useJoinLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/api/leagues/join', { code });
      return response.data;
    },
    onSuccess: () => {
      // Refetch leagues list
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues });
    },
  });
}

export default {
  useLeagues,
  useLeague,
  useLeaderboard,
  useCastaways,
  useWeeks,
  useActiveWeek,
  usePicks,
  useSubmitPicks,
  useWeeklyScores,
  useJoinLeague,
};
