/**
 * Hook for fetching and using site copy from the CMS
 */

import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'https://rgfl-api-production.up.railway.app';

interface SiteCopyData {
  data: Record<string, string>;
  cached?: boolean;
}

// Fetch all site copy
async function fetchSiteCopy(): Promise<Record<string, string>> {
  const response = await fetch(`${API_URL}/api/site-copy`);
  if (!response.ok) {
    throw new Error('Failed to fetch site copy');
  }
  const result: SiteCopyData = await response.json();
  return result.data || {};
}

// Fetch site copy for a specific page
async function fetchPageCopy(page: string): Promise<Record<string, string>> {
  const response = await fetch(`${API_URL}/api/site-copy/page/${page}`);
  if (!response.ok) {
    throw new Error('Failed to fetch page copy');
  }
  const result: SiteCopyData = await response.json();
  return result.data || {};
}

/**
 * Hook to get all site copy
 * Returns a getter function to retrieve copy by key with fallback
 */
export function useSiteCopy() {
  const {
    data: copyData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['site-copy'],
    queryFn: fetchSiteCopy,
    staleTime: 0, // Always refetch when component mounts
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: 'always', // Always refetch on mount
  });

  /**
   * Get copy by key with fallback
   * @param key - The copy key (e.g., 'leagues.header.title')
   * @param fallback - Fallback text if key not found
   */
  const getCopy = (key: string, fallback: string): string => {
    if (!copyData) return fallback;
    return copyData[key] || fallback;
  };

  return {
    getCopy,
    isLoading,
    error,
    data: copyData,
    refetch, // Expose refetch for manual refresh
  };
}

/**
 * Hook to get site copy for a specific page
 * More efficient when you only need copy for one page
 */
export function usePageCopy(page: string) {
  const {
    data: copyData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['site-copy', 'page', page],
    queryFn: () => fetchPageCopy(page),
    staleTime: 0, // Always refetch
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  const getCopy = (key: string, fallback: string): string => {
    if (!copyData) return fallback;
    // Try full key first, then just the key part after the page prefix
    return copyData[key] || copyData[`${page}.${key}`] || fallback;
  };

  return {
    getCopy,
    isLoading,
    error,
    data: copyData,
    refetch,
  };
}

/**
 * Predefined page heading keys
 * Use these constants to ensure consistency
 */
export const PAGE_COPY_KEYS = {
  // Leagues page
  LEAGUES_TITLE: 'leagues.header.title',
  LEAGUES_SUBTITLE: 'leagues.header.subtitle',

  // Dashboard page
  DASHBOARD_TITLE: 'dashboard.header.title',
  DASHBOARD_SUBTITLE: 'dashboard.header.subtitle',

  // How to Play page
  HOW_TO_PLAY_TITLE: 'how-to-play.header.title',
  HOW_TO_PLAY_SUBTITLE: 'how-to-play.header.subtitle',

  // Castaways page
  CASTAWAYS_TITLE: 'castaways.header.title',
  CASTAWAYS_SUBTITLE: 'castaways.header.subtitle',

  // Results page
  RESULTS_TITLE: 'results.header.title',
  RESULTS_SUBTITLE: 'results.header.subtitle',

  // Leaderboard page
  LEADERBOARD_TITLE: 'leaderboard.header.title',
  LEADERBOARD_SUBTITLE: 'leaderboard.header.subtitle',

  // Profile page
  PROFILE_TITLE: 'profile.header.title',
  PROFILE_SUBTITLE: 'profile.header.subtitle',

  // Weekly Timeline page
  TIMELINE_TITLE: 'timeline.header.title',
  TIMELINE_SUBTITLE: 'timeline.header.subtitle',

  // Scoring Rules page
  SCORING_RULES_TITLE: 'scoring-rules.header.title',
  SCORING_RULES_SUBTITLE: 'scoring-rules.header.subtitle',

  // Create League page
  CREATE_LEAGUE_TITLE: 'create-league.header.title',
  CREATE_LEAGUE_SUBTITLE: 'create-league.header.subtitle',

  // Join League page
  JOIN_LEAGUE_TITLE: 'join-league.header.title',
  JOIN_LEAGUE_SUBTITLE: 'join-league.header.subtitle',
} as const;
