/**
 * Season Query Hooks
 *
 * Centralized hooks for fetching season data.
 * Eliminates duplicated useQuery patterns across pages.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Season } from '@/types';

/**
 * Get the currently active season
 */
export function useActiveSeason() {
  return useQuery({
    queryKey: ['activeSeason'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Season | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - seasons rarely change
  });
}

/**
 * Get all seasons
 */
export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('number', { ascending: false });

      if (error) throw error;
      return data as Season[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a specific season by ID
 */
export function useSeason(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['season', seasonId],
    queryFn: async () => {
      if (!seasonId) return null;

      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('id', seasonId)
        .single();

      if (error) throw error;
      return data as Season;
    },
    enabled: !!seasonId,
    staleTime: 5 * 60 * 1000,
  });
}
