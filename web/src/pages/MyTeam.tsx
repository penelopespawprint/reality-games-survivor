import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Trophy, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';
import { getAvatarUrl } from '@/lib/avatar';

export default function MyTeam() {
  const { leagueId } = useParams<{ leagueId: string }>();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/leagues/${leagueId}`}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800">My Team</h1>
            <p className="text-neutral-500">{league?.name}</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 text-center">
            <Trophy className="h-5 w-5 text-burgundy-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-neutral-800">{membership?.rank || '-'}</p>
            <p className="text-neutral-500 text-xs">Rank</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 text-center">
            <Users className="h-5 w-5 text-burgundy-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-neutral-800">{roster?.length || 0}</p>
            <p className="text-neutral-500 text-xs">Castaways</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 text-center">
            <Calendar className="h-5 w-5 text-burgundy-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-neutral-800">{totalPoints}</p>
            <p className="text-neutral-500 text-xs">Points</p>
          </div>
        </div>

        {/* Current Roster */}
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 mb-6">
          <h2 className="text-lg font-display font-bold text-neutral-800 mb-4">Current Roster</h2>

          {roster && roster.length > 0 ? (
            <div className="space-y-3">
              {roster.map((entry: any) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    entry.castaways?.status === 'eliminated'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-cream-50 border border-cream-200'
                  }`}
                >
                  <img
                    src={getAvatarUrl(
                      entry.castaways?.name || 'Unknown',
                      entry.castaways?.photo_url
                    )}
                    alt={entry.castaways?.name || 'Castaway'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-neutral-800 font-medium">{entry.castaways?.name}</p>
                    <p className="text-neutral-500 text-sm">Round {entry.draft_round}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        entry.castaways?.status === 'eliminated'
                          ? 'bg-red-100 text-red-700'
                          : entry.castaways?.status === 'winner'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {entry.castaways?.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 text-center py-8">
              Draft hasn't started yet. Check back after the draft!
            </p>
          )}
        </div>

        {/* Pick History */}
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200">
          <h2 className="text-lg font-display font-bold text-neutral-800 mb-4">Pick History</h2>

          {pickHistory && pickHistory.length > 0 ? (
            <div className="space-y-2">
              {pickHistory.map((pick: any) => (
                <div
                  key={pick.id}
                  className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200"
                >
                  <div className="w-8 h-8 bg-burgundy-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{pick.episodes?.number}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-neutral-800 font-medium">
                      {pick.castaways?.name || 'No pick'}
                    </p>
                    <p className="text-neutral-500 text-sm capitalize">
                      {pick.status?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {pick.points_earned > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : pick.points_earned < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-neutral-400" />
                    )}
                    <span
                      className={`font-bold ${
                        pick.points_earned > 0
                          ? 'text-green-600'
                          : pick.points_earned < 0
                            ? 'text-red-600'
                            : 'text-neutral-500'
                      }`}
                    >
                      {pick.points_earned > 0 ? '+' : ''}
                      {pick.points_earned || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 text-center py-8">No picks yet. Season starts soon!</p>
          )}
        </div>
      </div>
    </>
  );
}
