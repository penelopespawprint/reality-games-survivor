import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Trophy, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MyTeam() {
  const { leagueId } = useParams<{ leagueId: string }>();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch league details
  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(*)')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
  });

  // Fetch my roster with castaways
  const { data: roster } = useQuery({
    queryKey: ['my-roster', leagueId],
    queryFn: async () => {
      if (!leagueId || !currentUser) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('rosters')
        .select('*, castaways(*)')
        .eq('league_id', leagueId)
        .eq('user_id', currentUser.id)
        .is('dropped_at', null)
        .order('draft_round', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!leagueId && !!currentUser,
  });

  // Fetch pick history
  const { data: pickHistory } = useQuery({
    queryKey: ['pick-history', leagueId],
    queryFn: async () => {
      if (!leagueId || !currentUser) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('weekly_picks')
        .select('*, episodes(*), castaways(*)')
        .eq('league_id', leagueId)
        .eq('user_id', currentUser.id)
        .order('episodes(number)', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!leagueId && !!currentUser,
  });

  // Fetch my membership stats
  const { data: membership } = useQuery({
    queryKey: ['my-membership', leagueId],
    queryFn: async () => {
      if (!leagueId || !currentUser) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', leagueId)
        .eq('user_id', currentUser.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId && !!currentUser,
  });

  const totalPoints = pickHistory?.reduce((sum, pick) => sum + (pick.points_earned || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to={`/leagues/${leagueId}`}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">My Team</h1>
          <p className="text-burgundy-200">{league?.name}</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
          <Trophy className="h-5 w-5 text-gold-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{membership?.rank || '-'}</p>
          <p className="text-burgundy-300 text-xs">Rank</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
          <Users className="h-5 w-5 text-gold-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{roster?.length || 0}</p>
          <p className="text-burgundy-300 text-xs">Castaways</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
          <Calendar className="h-5 w-5 text-gold-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{totalPoints}</p>
          <p className="text-burgundy-300 text-xs">Points</p>
        </div>
      </div>

      {/* Current Roster */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
        <h2 className="text-lg font-display font-bold text-white mb-4">Current Roster</h2>

        {roster && roster.length > 0 ? (
          <div className="space-y-3">
            {roster.map((entry: any) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  entry.castaways?.status === 'eliminated'
                    ? 'bg-red-500/20 border border-red-500/30'
                    : 'bg-burgundy-800/50'
                }`}
              >
                {entry.castaways?.photo_url ? (
                  <img
                    src={entry.castaways.photo_url}
                    alt={entry.castaways.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-burgundy-700 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-burgundy-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white font-medium">{entry.castaways?.name}</p>
                  <p className="text-burgundy-300 text-sm">
                    {entry.castaways?.tribe_original} • Round {entry.draft_round}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    entry.castaways?.status === 'eliminated'
                      ? 'bg-red-500/30 text-red-200'
                      : entry.castaways?.status === 'winner'
                      ? 'bg-gold-500/30 text-gold-200'
                      : 'bg-green-500/30 text-green-200'
                  }`}>
                    {entry.castaways?.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-burgundy-300 text-center py-8">
            Draft hasn't started yet. Check back after the draft!
          </p>
        )}
      </div>

      {/* Pick History */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <h2 className="text-lg font-display font-bold text-white mb-4">Pick History</h2>

        {pickHistory && pickHistory.length > 0 ? (
          <div className="space-y-2">
            {pickHistory.map((pick: any) => (
              <div
                key={pick.id}
                className="flex items-center gap-3 p-3 bg-burgundy-800/50 rounded-lg"
              >
                <div className="w-8 h-8 bg-burgundy-700 rounded-full flex items-center justify-center">
                  <span className="text-burgundy-300 text-sm font-bold">
                    {pick.episodes?.number}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">
                    {pick.castaways?.name || 'No pick'}
                  </p>
                  <p className="text-burgundy-300 text-sm capitalize">
                    {pick.status?.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {pick.points_earned > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : pick.points_earned < 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  ) : (
                    <Minus className="h-4 w-4 text-burgundy-400" />
                  )}
                  <span className={`font-bold ${
                    pick.points_earned > 0
                      ? 'text-green-400'
                      : pick.points_earned < 0
                      ? 'text-red-400'
                      : 'text-burgundy-300'
                  }`}>
                    {pick.points_earned > 0 ? '+' : ''}{pick.points_earned || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-burgundy-300 text-center py-8">
            No picks yet. Season starts soon!
          </p>
        )}
      </div>
    </div>
  );
}
