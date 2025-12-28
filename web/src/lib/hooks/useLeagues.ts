/**
 * League Query Hooks
 *
 * Centralized hooks for fetching league data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { League, LeagueMember } from '@/types';

/**
 * Get all leagues for a user
 */
export function useMyLeagues(userId: string | undefined) {
  return useQuery({
    queryKey: ['myLeagues', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('league_members')
        .select(
          `
          league_id,
          role,
          total_points,
          rank,
          joined_at,
          leagues (
            id,
            name,
            code,
            season_id,
            max_members,
            is_paid,
            entry_fee,
            commissioner_id,
            created_at
          )
        `
        )
        .eq('user_id', userId);

      if (error) throw error;

      // Transform the data to include league info at the top level
      return data.map((membership) => ({
        ...membership.leagues,
        membership: {
          role: membership.role,
          total_points: membership.total_points,
          rank: membership.rank,
          joined_at: membership.joined_at,
        },
      })) as (League & { membership: Partial<LeagueMember> })[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get a specific league by ID with related data
 */
export function useLeague(leagueId: string | undefined) {
  return useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) return null;

      const { data, error } = await supabase
        .from('leagues')
        .select(
          `
          *,
          seasons(*),
          commissioner:users!leagues_commissioner_id_fkey(id, display_name)
        `
        )
        .eq('id', leagueId)
        .single();

      if (error) throw error;
      return data as League;
    },
    enabled: !!leagueId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get league members with their standings
 */
export function useLeagueMembers(leagueId: string | undefined) {
  return useQuery({
    queryKey: ['leagueMembers', leagueId],
    queryFn: async () => {
      if (!leagueId) return [];

      const { data, error } = await supabase
        .from('league_members')
        .select(
          `
          *,
          users (
            id,
            display_name,
            avatar_url
          )
        `
        )
        .eq('league_id', leagueId)
        .order('rank', { ascending: true });

      if (error) throw error;
      return data as (LeagueMember & { users: { id: string; display_name: string; avatar_url: string | null } })[];
    },
    enabled: !!leagueId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get a specific user's membership in a league
 */
export function useLeagueMembership(leagueId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['leagueMembership', leagueId, userId],
    queryFn: async () => {
      if (!leagueId || !userId) return null;

      const { data, error } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as LeagueMember | null;
    },
    enabled: !!leagueId && !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get the global league for a season
 */
export function useGlobalLeague(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['globalLeague', seasonId],
    queryFn: async () => {
      if (!seasonId) return null;

      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('season_id', seasonId)
        .eq('name', 'Global League')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as League | null;
    },
    enabled: !!seasonId,
    staleTime: 5 * 60 * 1000,
  });
}
