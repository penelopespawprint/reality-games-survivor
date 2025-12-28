/**
 * React Query Configuration
 *
 * Centralized query client with caching, retry, and offline support
 */

import { QueryClient } from '@tanstack/react-query';
import { isOnline } from '../services/offline';

// Query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Only retry when online
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (mobile app resume)
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations when back online
      retry: 1,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  // Auth
  user: ['user'] as const,

  // Leagues
  leagues: ['leagues'] as const,
  league: (id: string) => ['leagues', id] as const,
  leagueMembers: (id: string) => ['leagues', id, 'members'] as const,
  leagueLeaderboard: (id: string) => ['leagues', id, 'leaderboard'] as const,

  // Castaways
  castaways: ['castaways'] as const,
  castaway: (id: string) => ['castaways', id] as const,

  // Picks
  picks: (leagueId: string) => ['picks', leagueId] as const,
  weeklyPicks: (leagueId: string, weekId: string) => ['picks', leagueId, weekId] as const,

  // Weeks
  weeks: ['weeks'] as const,
  activeWeek: ['weeks', 'active'] as const,

  // Scores
  scores: (weekId: string) => ['scores', weekId] as const,
  userScores: (userId: string) => ['scores', 'user', userId] as const,
};
