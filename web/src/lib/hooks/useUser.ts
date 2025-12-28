/**
 * User Query Hooks
 *
 * Centralized hooks for fetching user data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserProfile, NotificationPreferences } from '@/types';

/**
 * Get the current authenticated user's profile
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a specific user's profile by ID
 */
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get user's notification preferences
 */
export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ['notificationPreferences', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as NotificationPreferences | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
