import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Globe,
  Trophy,
  Users,
  TrendingUp,
  Crown,
  Medal,
  Loader2,
  Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Navigation } from '@/components/Navigation';

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
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </>
    );
  }

  if (!globalLeague) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <Link
              to="/admin"
              className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <h1 className="text-2xl font-display font-bold text-neutral-800">Global League</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 text-center">
            <Globe className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-2">
              No Global League Found
            </h2>
            <p className="text-neutral-500 mb-6">
              Create a global league to enable cross-league rankings.
            </p>
            <button className="btn btn-primary">Create Global League</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/admin"
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <Globe className="h-6 w-6 text-burgundy-500" />
              Global League
            </h1>
            <p className="text-neutral-500">
              Season {globalLeague.seasons?.number}: {globalLeague.seasons?.name}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-burgundy-50 border border-burgundy-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-burgundy-500" />
              <span className="text-burgundy-600 text-sm">Total Players</span>
            </div>
            <p className="text-3xl font-bold text-neutral-800">{stats?.totalPlayers || 0}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-green-600 text-sm">Average Score</span>
            </div>
            <p className="text-3xl font-bold text-neutral-800">{stats?.averageScore || 0}</p>
          </div>
        </div>

        {/* Top Scorer */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-amber-200 rounded-full flex items-center justify-center">
              <Crown className="h-8 w-8 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-amber-700 text-sm">Current Leader</p>
              <p className="text-2xl font-bold text-neutral-800">{stats?.topScorer}</p>
              <p className="text-amber-600 font-medium">{stats?.topScore} points</p>
            </div>
            <Star className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        {/* Top 100 Standings */}
        <div className="bg-white rounded-2xl shadow-card border border-cream-200">
          <div className="px-4 py-3 border-b border-cream-200 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-burgundy-500" />
              Top 100 Global Rankings
            </h2>
          </div>

          <div className="divide-y divide-cream-100">
            {standings?.map((member: any, index: number) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 px-4 py-3 ${index < 3 ? 'bg-amber-50' : ''}`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  {index === 0 ? (
                    <span className="text-2xl">🥇</span>
                  ) : index === 1 ? (
                    <span className="text-2xl">🥈</span>
                  ) : index === 2 ? (
                    <span className="text-2xl">🥉</span>
                  ) : (
                    <span
                      className={`font-bold ${
                        index < 10 ? 'text-burgundy-500' : 'text-neutral-400'
                      }`}
                    >
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
                  <div className="w-8 h-8 bg-cream-100 rounded-full flex items-center justify-center border border-cream-200">
                    <Users className="h-4 w-4 text-neutral-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-neutral-800 font-medium truncate">
                    {member.users?.display_name}
                  </p>
                </div>

                <p
                  className={`font-bold ${
                    index === 0
                      ? 'text-amber-600 text-lg'
                      : index < 3
                        ? 'text-amber-600'
                        : 'text-neutral-800'
                  }`}
                >
                  {member.total_points || 0}
                </p>
              </div>
            ))}
          </div>

          {(!standings || standings.length === 0) && (
            <div className="p-8 text-center">
              <Medal className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-500">
                No rankings yet. Scoring will begin after the premiere.
              </p>
            </div>
          )}
        </div>

        {/* League Info */}
        <div className="mt-6 bg-white rounded-2xl shadow-card p-4 border border-cream-200">
          <h3 className="text-neutral-800 font-medium mb-3">League Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-neutral-400">Code:</span>{' '}
              <span className="text-neutral-800 font-mono">{globalLeague.code}</span>
            </div>
            <div>
              <span className="text-neutral-400">Status:</span>{' '}
              <span className="text-neutral-800">{globalLeague.status}</span>
            </div>
            <div>
              <span className="text-neutral-400">Created:</span>{' '}
              <span className="text-neutral-800">
                {new Date(globalLeague.created_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-neutral-400">Max Players:</span>{' '}
              <span className="text-neutral-800">{globalLeague.max_players}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
