import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Globe, Trophy, Users, TrendingUp, Crown, Medal, Loader2, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function AdminGlobal() {
  // Fetch global league
  const { data: globalLeague, isLoading: leagueLoading } = useQuery({
    queryKey: ['global-league'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(*)')
        .eq('is_global', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch global standings
  const { data: standings, isLoading: standingsLoading } = useQuery({
    queryKey: ['global-standings', globalLeague?.id],
    queryFn: async () => {
      if (!globalLeague?.id) throw new Error('No global league');
      const { data, error } = await supabase
        .from('league_members')
        .select('*, users(display_name, avatar_url)')
        .eq('league_id', globalLeague.id)
        .order('total_points', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!globalLeague?.id,
  });

  // Fetch global stats
  const { data: stats } = useQuery({
    queryKey: ['global-stats', globalLeague?.id],
    queryFn: async () => {
      if (!globalLeague?.id) throw new Error('No global league');

      const { count: totalPlayers } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', globalLeague.id);

      const { data: topScorer } = await supabase
        .from('league_members')
        .select('total_points, users(display_name)')
        .eq('league_id', globalLeague.id)
        .order('total_points', { ascending: false })
        .limit(1)
        .single();

      const { data: avgPoints } = await supabase
        .from('league_members')
        .select('total_points')
        .eq('league_id', globalLeague.id);

      const average = avgPoints?.length
        ? avgPoints.reduce((sum, p) => sum + (p.total_points || 0), 0) / avgPoints.length
        : 0;

      return {
        totalPlayers: totalPlayers || 0,
        topScore: topScorer?.total_points || 0,
        topScorer: (topScorer?.users as any)?.display_name || 'N/A',
        averageScore: Math.round(average),
      };
    },
    enabled: !!globalLeague?.id,
  });

  const isLoading = leagueLoading || standingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  if (!globalLeague) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/admin"
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <h1 className="text-2xl font-display font-bold text-white">Global League</h1>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
          <Globe className="h-16 w-16 text-burgundy-400 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-white mb-2">No Global League Found</h2>
          <p className="text-burgundy-200 mb-6">
            Create a global league to enable cross-league rankings.
          </p>
          <button className="bg-gold-500 hover:bg-gold-400 text-burgundy-900 font-bold px-6 py-3 rounded-lg transition-colors">
            Create Global League
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-gold-500" />
            Global League
          </h1>
          <p className="text-burgundy-200">
            Season {globalLeague.seasons?.number}: {globalLeague.seasons?.name}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-gold-500" />
            <span className="text-gold-300 text-sm">Total Players</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.totalPlayers || 0}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <span className="text-green-300 text-sm">Average Score</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.averageScore || 0}</p>
        </div>
      </div>

      {/* Top Scorer */}
      <div className="bg-gradient-to-r from-gold-500/20 to-amber-500/20 border border-gold-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gold-500/30 rounded-full flex items-center justify-center">
            <Crown className="h-8 w-8 text-gold-500" />
          </div>
          <div className="flex-1">
            <p className="text-gold-300 text-sm">Current Leader</p>
            <p className="text-2xl font-bold text-white">{stats?.topScorer}</p>
            <p className="text-gold-400 font-medium">{stats?.topScore} points</p>
          </div>
          <Star className="h-8 w-8 text-gold-500" />
        </div>
      </div>

      {/* Top 100 Standings */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold-500" />
            Top 100 Global Rankings
          </h2>
        </div>

        <div className="divide-y divide-white/5">
          {standings?.map((member: any, index: number) => (
            <div
              key={member.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                index < 3 ? 'bg-gold-500/5' : ''
              }`}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                {index === 0 ? (
                  <span className="text-2xl">🥇</span>
                ) : index === 1 ? (
                  <span className="text-2xl">🥈</span>
                ) : index === 2 ? (
                  <span className="text-2xl">🥉</span>
                ) : (
                  <span className={`font-bold ${
                    index < 10 ? 'text-gold-500' : 'text-burgundy-400'
                  }`}>
                    {index + 1}
                  </span>
                )}
              </div>

              {member.users?.avatar_url ? (
                <img
                  src={member.users.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-burgundy-700 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-burgundy-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {member.users?.display_name}
                </p>
              </div>

              <p className={`font-bold ${
                index === 0 ? 'text-gold-500 text-lg' :
                index < 3 ? 'text-gold-400' : 'text-white'
              }`}>
                {member.total_points || 0}
              </p>
            </div>
          ))}
        </div>

        {(!standings || standings.length === 0) && (
          <div className="p-8 text-center">
            <Medal className="h-12 w-12 text-burgundy-400 mx-auto mb-4" />
            <p className="text-burgundy-200">No rankings yet. Scoring will begin after the premiere.</p>
          </div>
        )}
      </div>

      {/* League Info */}
      <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <h3 className="text-white font-medium mb-3">League Details</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-burgundy-400">Code:</span>{' '}
            <span className="text-white font-mono">{globalLeague.code}</span>
          </div>
          <div>
            <span className="text-burgundy-400">Status:</span>{' '}
            <span className="text-white">{globalLeague.status}</span>
          </div>
          <div>
            <span className="text-burgundy-400">Created:</span>{' '}
            <span className="text-white">{new Date(globalLeague.created_at).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-burgundy-400">Max Players:</span>{' '}
            <span className="text-white">{globalLeague.max_players}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
