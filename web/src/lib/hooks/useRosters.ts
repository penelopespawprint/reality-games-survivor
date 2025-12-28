/**
 * Roster Query Hooks
 *
 * Centralized hooks for fetching roster data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Roster, Castaway } from '@/types';

/**
 * Get a user's roster for a specific league
 */
export function useRoster(leagueId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['roster', leagueId, userId],
    queryFn: async () => {
      if (!leagueId || !userId) return [];

      const { data, error } = await supabase
        .from('rosters')
        .select(
          `
          *,
          castaways (
            id,
            name,
            status,
            tribe,
            placement,
            image_url
          )
        `
        )
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .order('draft_order', { ascending: true });

      if (error) throw error;
      return data as (Roster & { castaways: Castaway })[];
    },
    enabled: !!leagueId && !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get all rosters for a league (all users)
 */
export function useLeagueRosters(leagueId: string | undefined) {
  return useQuery({
    queryKey: ['leagueRosters', leagueId],
    queryFn: async () => {
      if (!leagueId) return [];

      const { data, error } = await supabase
        .from('rosters')
        .select(
          `
          *,
          users (
            id,
            display_name
          ),
          castaways (
            id,
            name,
            status,
            tribe,
            placement,
            image_url
          )
        `
        )
        .eq('league_id', leagueId)
        .order('user_id', { ascending: true })
        .order('draft_order', { ascending: true });

      if (error) throw error;
      return data as (Roster & {
        users: { id: string; display_name: string };
        castaways: Castaway;
      })[];
    },
    enabled: !!leagueId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get all of a user's rosters across all leagues
 */
export function useMyRosters(userId: string | undefined) {
  return useQuery({
    queryKey: ['myRosters', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('rosters')
        .select(
          `
          *,
          leagues (
            id,
            name
          ),
          castaways (
            id,
            name,
            status,
            tribe,
            placement,
            image_url
          )
        `
        )
        .eq('user_id', userId)
        .order('league_id', { ascending: true })
        .order('draft_order', { ascending: true });

      if (error) throw error;
      return data as (Roster & {
        leagues: { id: string; name: string };
        castaways: Castaway;
      })[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Check if a user has a complete roster (2 castaways) in a league
 */
export function useRosterComplete(leagueId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['rosterComplete', leagueId, userId],
    queryFn: async () => {
      if (!leagueId || !userId) return false;

      const { count, error } = await supabase
        .from('rosters')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)
        .eq('user_id', userId);

      if (error) throw error;
      return count === 2;
    },
    enabled: !!leagueId && !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
