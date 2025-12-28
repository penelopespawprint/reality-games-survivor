/**
 * Weekly Picks Query Hooks
 *
 * Centralized hooks for fetching weekly pick data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { WeeklyPick, Castaway } from '@/types';

/**
 * Get a user's pick for a specific episode in a league
 */
export function useWeeklyPick(
  leagueId: string | undefined,
  userId: string | undefined,
  episodeId: string | undefined
) {
  return useQuery({
    queryKey: ['weeklyPick', leagueId, userId, episodeId],
    queryFn: async () => {
      if (!leagueId || !userId || !episodeId) return null;

      const { data, error } = await supabase
        .from('weekly_picks')
        .select(
          `
          *,
          castaways (
            id,
            name,
            status,
            tribe,
            image_url
          )
        `
        )
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as (WeeklyPick & { castaways: Castaway }) | null;
    },
    enabled: !!leagueId && !!userId && !!episodeId,
    staleTime: 1 * 60 * 1000, // 1 minute - picks can change frequently
  });
}

/**
 * Get all of a user's picks for a league (all episodes)
 */
export function useUserLeaguePicks(leagueId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['userLeaguePicks', leagueId, userId],
    queryFn: async () => {
      if (!leagueId || !userId) return [];

      const { data, error } = await supabase
        .from('weekly_picks')
        .select(
          `
          *,
          episodes (
            id,
            number,
            title,
            air_date
          ),
          castaways (
            id,
            name,
            status,
            tribe,
            image_url
          )
        `
        )
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (WeeklyPick & {
        episodes: { id: string; number: number; title: string; air_date: string };
        castaways: Castaway;
      })[];
    },
    enabled: !!leagueId && !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get all picks for an episode in a league (all users)
 */
export function useEpisodePicks(leagueId: string | undefined, episodeId: string | undefined) {
  return useQuery({
    queryKey: ['episodePicks', leagueId, episodeId],
    queryFn: async () => {
      if (!leagueId || !episodeId) return [];

      const { data, error } = await supabase
        .from('weekly_picks')
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
            image_url
          )
        `
        )
        .eq('league_id', leagueId)
        .eq('episode_id', episodeId);

      if (error) throw error;
      return data as (WeeklyPick & {
        users: { id: string; display_name: string };
        castaways: Castaway;
      })[];
    },
    enabled: !!leagueId && !!episodeId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Check if picks are locked for an episode
 */
export function usePicksLocked(episodeId: string | undefined) {
  return useQuery({
    queryKey: ['picksLocked', episodeId],
    queryFn: async () => {
      if (!episodeId) return true; // Default to locked if no episode

      const { data, error } = await supabase
        .from('episodes')
        .select('picks_locked_at')
        .eq('id', episodeId)
        .single();

      if (error) throw error;

      if (!data.picks_locked_at) return false;
      return new Date(data.picks_locked_at) <= new Date();
    },
    enabled: !!episodeId,
    staleTime: 30 * 1000, // 30 seconds - check frequently near lock time
  });
}

/**
 * Get the current episode's pick status for a user in a league
 */
export function useCurrentPickStatus(leagueId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['currentPickStatus', leagueId, userId],
    queryFn: async () => {
      if (!leagueId || !userId) return null;

      // First get the current episode
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!season) return null;

      const { data: episode } = await supabase
        .from('episodes')
        .select('id, number, picks_locked_at')
        .eq('season_id', season.id)
        .gte('air_date', new Date().toISOString().split('T')[0])
        .order('air_date', { ascending: true })
        .limit(1)
        .single();

      if (!episode) return null;

      // Get the user's pick for this episode
      const { data: pick } = await supabase
        .from('weekly_picks')
        .select('id, castaway_id, is_auto_pick')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .eq('episode_id', episode.id)
        .single();

      const isLocked = episode.picks_locked_at
        ? new Date(episode.picks_locked_at) <= new Date()
        : false;

      return {
        episodeId: episode.id,
        episodeNumber: episode.number,
        hasPick: !!pick,
        isAutoPick: pick?.is_auto_pick || false,
        isLocked,
        locksAt: episode.picks_locked_at,
      };
    },
    enabled: !!leagueId && !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
