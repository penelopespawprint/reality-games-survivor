/**
 * React Hook for Site Copy Management
 *
 * Fetches content from the CMS database with caching and fallback support.
 * Allows frontend to use database-driven copy instead of hardcoding text.
 *
 * Usage:
 *   const { copy, loading } = useSiteCopy('home.hero.title', 'Fantasy Survivor');
 *   return <h1>{copy}</h1>;
 */

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

interface SiteCopy {
  id: string;
  key: string;
  page: string;
  section: string | null;
  content_type: string;
  content: string;
  is_active: boolean;
}

/**
 * Fetch a single piece of site copy by key
 *
 * @param key - The copy key (e.g., 'home.hero.title')
 * @param fallback - Text to use if database copy doesn't exist
 * @returns { copy, loading, error }
 */
export function useSiteCopy(key: string, fallback: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['site-copy', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_copy')
        .select('*')
        .eq('key', key)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - return null to trigger fallback
          return null;
        }
        throw error;
      }

      return data as SiteCopy;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once on failure
  });

  return {
    copy: data?.content || fallback,
    loading: isLoading,
    error,
    source: data ? 'database' : 'fallback',
  };
}

/**
 * Fetch multiple pieces of site copy for a page
 *
 * @param page - The page name (e.g., 'home', 'dashboard')
 * @param fallbacks - Object with fallback text for each key
 * @returns { copy, loading, error }
 */
export function usePageCopy(page: string, fallbacks: Record<string, string> = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['site-copy', 'page', page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_copy')
        .select('*')
        .eq('page', page)
        .eq('is_active', true);

      if (error) throw error;

      return (data as SiteCopy[]) || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  // Convert array to key-value object
  const copyMap: Record<string, string> = {};
  data?.forEach((item) => {
    copyMap[item.key] = item.content;
  });

  // Merge with fallbacks
  const finalCopy = { ...fallbacks };
  Object.keys(copyMap).forEach((key) => {
    finalCopy[key] = copyMap[key];
  });

  return {
    copy: finalCopy,
    loading: isLoading,
    error,
  };
}

/**
 * Prefetch site copy (useful for performance optimization)
 *
 * @param queryClient - React Query client instance
 * @param key - The copy key to prefetch
 */
export async function prefetchSiteCopy(queryClient: QueryClient, key: string) {
  await queryClient.prefetchQuery({
    queryKey: ['site-copy', key],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_copy')
        .select('*')
        .eq('key', key)
        .eq('is_active', true)
        .single();

      return data as SiteCopy | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
