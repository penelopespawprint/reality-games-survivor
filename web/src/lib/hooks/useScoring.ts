/**
 * Scoring Query Hooks
 *
 * Centralized hooks for fetching scoring data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ScoringRule, EpisodeScore } from '@/types';

/**
 * Get all scoring rules for a season
 */
export function useScoringRules(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['scoringRules', seasonId],
    queryFn: async () => {
      if (!seasonId) return [];

      const { data, error } = await supabase
        .from('scoring_rules')
        .select('*')
        .eq('season_id', seasonId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as ScoringRule[];
    },
    enabled: !!seasonId,
    staleTime: 30 * 60 * 1000, // 30 minutes - rules rarely change
  });
}

/**
 * Get scoring rules grouped by category
 */
export function useScoringRulesByCategory(seasonId: string | undefined) {
  const query = useScoringRules(seasonId);

  const groupedRules = query.data?.reduce(
    (acc, rule) => {
      const category = rule.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(rule);
      return acc;
    },
    {} as Record<string, ScoringRule[]>
  );

  return {
    ...query,
    data: groupedRules,
  };
}

/**
 * Get episode scores for a specific episode
 */
export function useEpisodeScores(episodeId: string | undefined) {
  return useQuery({
    queryKey: ['episodeScores', episodeId],
    queryFn: async () => {
      if (!episodeId) return [];

      const { data, error } = await supabase
        .from('episode_scores')
        .select(
          `
          *,
          castaways (
            id,
            name,
            tribe,
            status
          ),
          scoring_rules (
            id,
            name,
            points,
            category
          )
        `
        )
        .eq('episode_id', episodeId);

      if (error) throw error;
      return data as (EpisodeScore & {
        castaways: { id: string; name: string; tribe: string; status: string };
        scoring_rules: { id: string; name: string; points: number; category: string };
      })[];
    },
    enabled: !!episodeId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get total scores for each castaway in an episode
 */
export function useEpisodeCastawayScores(episodeId: string | undefined) {
  const query = useEpisodeScores(episodeId);

  const castawayScores = query.data?.reduce(
    (acc, score) => {
      const castawayId = score.castaway_id;
      if (!acc[castawayId]) {
        acc[castawayId] = {
          castaway: score.castaways,
          totalPoints: 0,
          scores: [],
        };
      }
      const points = score.scoring_rules.points * (score.count || 1);
      acc[castawayId].totalPoints += points;
      acc[castawayId].scores.push({
        rule: score.scoring_rules,
        count: score.count || 1,
        points,
      });
      return acc;
    },
    {} as Record<
      string,
      {
        castaway: { id: string; name: string; tribe: string; status: string };
        totalPoints: number;
        scores: { rule: { id: string; name: string; points: number; category: string }; count: number; points: number }[];
      }
    >
  );

  return {
    ...query,
    data: castawayScores ? Object.values(castawayScores) : undefined,
  };
}

/**
 * Get a user's total points across all episodes in a league
 */
export function useUserLeaguePoints(leagueId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['userLeaguePoints', leagueId, userId],
    queryFn: async () => {
      if (!leagueId || !userId) return null;

      const { data, error } = await supabase
        .from('league_members')
        .select('total_points, rank')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as { total_points: number; rank: number };
    },
    enabled: !!leagueId && !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
