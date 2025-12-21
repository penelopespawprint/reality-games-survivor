import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Users, Calendar, ArrowRight, Loader2, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LeagueHome() {
  const { id } = useParams<{ id: string }>();

  // Fetch league details
  const { data: league, isLoading: leagueLoading } = useQuery({
    queryKey: ['league', id],
    queryFn: async () => {
      if (!id) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch league members with standings
  const { data: members } = useQuery({
    queryKey: ['league-members', id],
    queryFn: async () => {
      if (!id) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('league_members')
        .select('*, users(id, display_name, avatar_url)')
        .eq('league_id', id)
        .order('total_points', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch current user's roster
  const { data: myRoster } = useQuery({
    queryKey: ['my-roster', id],
    queryFn: async () => {
      if (!id) throw new Error('No league ID');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('rosters')
        .select('*, castaways(*)')
        .eq('league_id', id)
        .eq('user_id', user.id)
        .is('dropped_at', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Get current user ID
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  if (leagueLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <p className="text-white">League not found</p>
      </div>
    );
  }

  const myMembership = members?.find(m => m.user_id === currentUser?.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white">{league.name}</h1>
        <p className="text-burgundy-200">
          Season {league.seasons?.number}: {league.seasons?.name}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
          <Trophy className="h-6 w-6 text-gold-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{myMembership?.rank || '-'}</p>
          <p className="text-burgundy-300 text-sm">Your Rank</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
          <Users className="h-6 w-6 text-gold-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{members?.length || 0}</p>
          <p className="text-burgundy-300 text-sm">Players</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
          <Calendar className="h-6 w-6 text-gold-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{myMembership?.total_points || 0}</p>
          <p className="text-burgundy-300 text-sm">Points</p>
        </div>
      </div>

      {/* My Team */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-white">My Team</h2>
          <Link
            to={`/leagues/${id}/team`}
            className="text-gold-500 hover:text-gold-400 text-sm flex items-center gap-1"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {myRoster && myRoster.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {myRoster.map((roster: any) => (
              <div
                key={roster.id}
                className={`p-3 rounded-lg ${
                  roster.castaways?.status === 'eliminated'
                    ? 'bg-red-500/20 border border-red-500/30'
                    : 'bg-burgundy-800/50'
                }`}
              >
                <p className="text-white font-medium">{roster.castaways?.name}</p>
                <p className="text-burgundy-300 text-sm capitalize">
                  {roster.castaways?.status}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-burgundy-300 text-center py-4">
            Draft hasn't started yet
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          to={`/leagues/${id}/pick`}
          className="bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold py-4 rounded-xl text-center transition-colors"
        >
          Make Pick
        </Link>
        <Link
          to={`/leagues/${id}/draft`}
          className="bg-burgundy-700 hover:bg-burgundy-600 text-white font-bold py-4 rounded-xl text-center transition-colors"
        >
          Draft Room
        </Link>
      </div>

      {/* Standings Preview */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-white">Standings</h2>
          <Link
            to="/leaderboard"
            className="text-gold-500 hover:text-gold-400 text-sm flex items-center gap-1"
          >
            Full Leaderboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-2">
          {members?.slice(0, 5).map((member: any, index: number) => (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                member.user_id === currentUser?.id
                  ? 'bg-gold-500/20 border border-gold-500/30'
                  : 'bg-burgundy-800/50'
              }`}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                {index === 0 ? (
                  <Crown className="h-5 w-5 text-gold-500" />
                ) : (
                  <span className="text-burgundy-300 font-bold">{index + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{member.users?.display_name}</p>
              </div>
              <p className="text-gold-500 font-bold">{member.total_points || 0}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
