/**
 * Episode Query Hooks
 *
 * Centralized hooks for fetching episode data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Episode } from '@/types';

/**
 * Get all episodes for a season
 */
export function useEpisodes(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['episodes', seasonId],
    queryFn: async () => {
      if (!seasonId) return [];

      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', seasonId)
        .order('number', { ascending: true });

      if (error) throw error;
      return data as Episode[];
    },
    enabled: !!seasonId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get the next upcoming episode (next one that hasn't been scored)
 */
export function useNextEpisode(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['nextEpisode', seasonId],
    queryFn: async () => {
      if (!seasonId) return null;

      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', seasonId)
        .eq('is_scored', false)
        .order('number', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Episode | null;
    },
    enabled: !!seasonId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Get the current episode (next one with picks_lock_at in the future)
 */
export function useCurrentEpisode(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['currentEpisode', seasonId],
    queryFn: async () => {
      if (!seasonId) return null;

      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', seasonId)
        .gte('picks_lock_at', new Date().toISOString())
        .order('picks_lock_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Episode | null;
    },
    enabled: !!seasonId,
    staleTime: 30 * 1000, // 30 seconds - time-sensitive
  });
}

/**
 * Get a specific episode by ID
 */
export function useEpisode(episodeId: string | undefined) {
  return useQuery({
    queryKey: ['episode', episodeId],
    queryFn: async () => {
      if (!episodeId) return null;

      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', episodeId)
        .single();

      if (error) throw error;
      return data as Episode;
    },
    enabled: !!episodeId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get the previous episode (last one that was scored)
 */
export function usePreviousEpisode(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['previousEpisode', seasonId],
    queryFn: async () => {
      if (!seasonId) return null;

      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', seasonId)
        .eq('is_scored', true)
        .order('number', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Episode | null;
    },
    enabled: !!seasonId,
    staleTime: 2 * 60 * 1000,
  });
}
