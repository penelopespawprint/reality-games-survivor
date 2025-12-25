import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || '';

interface League {
  id: string;
  season_id: string;
  name: string;
  code: string;
  commissioner_id: string;
  max_players: number;
  is_global: boolean;
  is_public: boolean;
  require_donation: boolean;
  donation_amount: number | null;
  status: 'forming' | 'drafting' | 'active' | 'completed';
  draft_status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

interface LeagueMember {
  id: string;
  user_id: string;
  draft_position: number | null;
  total_points: number;
  rank: number | null;
  joined_at: string;
  users: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface LeagueWithMembers extends League {
  members: LeagueMember[];
  commissioner: {
    id: string;
    display_name: string;
  };
}

/**
 * Hook to fetch a single league by ID
 */
export function useLeague(leagueId: string | undefined) {
  return useQuery<LeagueWithMembers>({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('League ID required');

      const { data: league, error } = await supabase
        .from('leagues')
        .select(`
          *,
          members:league_members (
            id,
            user_id,
            draft_position,
            total_points,
            rank,
            joined_at,
            users (
              id,
              display_name,
              avatar_url
            )
          ),
          commissioner:users!commissioner_id (
            id,
            display_name
          )
        `)
        .eq('id', leagueId)
        .single();

      if (error) throw error;
      return league as LeagueWithMembers;
    },
    enabled: !!leagueId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch league standings
 */
export function useLeagueStandings(leagueId: string | undefined) {
  return useQuery({
    queryKey: ['league-standings', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('League ID required');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${API_URL}/api/leagues/${leagueId}/standings`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch standings');
      return response.json();
    },
    enabled: !!leagueId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch user's leagues
 */
export function useUserLeagues() {
  return useQuery({
    queryKey: ['user-leagues'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('league_members')
        .select(`
          league_id,
          total_points,
          rank,
          leagues (
            id,
            name,
            code,
            status,
            is_global,
            commissioner_id
          )
        `)
        .eq('user_id', session.user.id);

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to join a league
 */
export function useJoinLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leagueId, password }: { leagueId: string; password?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${API_URL}/api/leagues/${leagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join league');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-leagues'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/**
 * Hook to leave a league
 */
export function useLeaveLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leagueId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${API_URL}/api/leagues/${leagueId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave league');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-leagues'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

/**
 * Check if user is commissioner of a league
 */
export function useIsCommissioner(leagueId: string | undefined) {
  const { data: league } = useLeague(leagueId);

  return useQuery({
    queryKey: ['is-commissioner', leagueId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !league) return false;
      return league.commissioner_id === session.user.id;
    },
    enabled: !!league,
  });
}
