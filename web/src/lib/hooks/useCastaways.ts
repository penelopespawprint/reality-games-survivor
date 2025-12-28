/**
 * Castaway Query Hooks
 *
 * Centralized hooks for fetching castaway data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Castaway } from '@/types';

/**
 * Get all castaways for a season
 */
export function useCastaways(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['castaways', seasonId],
    queryFn: async () => {
      if (!seasonId) return [];

      const { data, error } = await supabase
        .from('castaways')
        .select('*')
        .eq('season_id', seasonId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Castaway[];
    },
    enabled: !!seasonId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get only active castaways for a season
 */
export function useActiveCastaways(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['activeCastaways', seasonId],
    queryFn: async () => {
      if (!seasonId) return [];

      const { data, error } = await supabase
        .from('castaways')
        .select('*')
        .eq('season_id', seasonId)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Castaway[];
    },
    enabled: !!seasonId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get a specific castaway by ID
 */
export function useCastaway(castawayId: string | undefined) {
  return useQuery({
    queryKey: ['castaway', castawayId],
    queryFn: async () => {
      if (!castawayId) return null;

      const { data, error } = await supabase
        .from('castaways')
        .select('*')
        .eq('id', castawayId)
        .single();

      if (error) throw error;
      return data as Castaway;
    },
    enabled: !!castawayId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get eliminated castaways for a season
 */
export function useEliminatedCastaways(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['eliminatedCastaways', seasonId],
    queryFn: async () => {
      if (!seasonId) return [];

      const { data, error } = await supabase
        .from('castaways')
        .select('*')
        .eq('season_id', seasonId)
        .eq('status', 'eliminated')
        .order('placement', { ascending: false });

      if (error) throw error;
      return data as Castaway[];
    },
    enabled: !!seasonId,
    staleTime: 2 * 60 * 1000,
  });
}
