import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function EpisodeResults() {
  const { leagueId, episodeId } = useParams<{ leagueId: string; episodeId: string }>();

  // Fetch episode details
  const { data: episode, isLoading: episodeLoading } = useQuery({
    queryKey: ['episode', episodeId],
    queryFn: async () => {
      if (!episodeId) throw new Error('No episode ID');
      const { data, error } = await supabase
        .from('episodes')
        .select('*, seasons(*)')
        .eq('id', episodeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!episodeId,
  });

  // Fetch league details
  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
  });

  // Fetch episode scores with castaways and rules
  const { data: scores } = useQuery({
    queryKey: ['episode-scores', episodeId],
    queryFn: async () => {
      if (!episodeId) throw new Error('No episode ID');
      const { data, error } = await supabase
        .from('episode_scores')
        .select('*, castaways(*), scoring_rules(*)')
        .eq('episode_id', episodeId)
        .order('castaways(name)');
      if (error) throw error;
      return data || [];
    },
    enabled: !!episodeId,
  });

  // Fetch picks for this episode in this league
  const { data: picks } = useQuery({
    queryKey: ['episode-picks', leagueId, episodeId],
    queryFn: async () => {
      if (!leagueId || !episodeId) throw new Error('Missing data');
      const { data, error } = await supabase
        .from('weekly_picks')
        .select('*, users(display_name), castaways(*)')
        .eq('league_id', leagueId)
        .eq('episode_id', episodeId)
        .order('points_earned', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!leagueId && !!episodeId,
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Group scores by castaway
  const scoresByCastaway = scores?.reduce((acc: Record<string, any>, score) => {
    const castawayId = score.castaway_id;
    if (!acc[castawayId]) {
      acc[castawayId] = {
        castaway: score.castaways,
        scores: [],
        total: 0,
      };
    }
    acc[castawayId].scores.push(score);
    acc[castawayId].total += score.points;
    return acc;
  }, {}) || {};

  const myPick = picks?.find(p => p.user_id === currentUser?.id);

  if (episodeLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-burgundy-900 via-burgundy-800 to-burgundy-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-display font-bold text-white">
            Episode {episode?.number} Results
          </h1>
          <p className="text-burgundy-200">{episode?.title || league?.name}</p>
        </div>
      </div>

      {/* My Pick Summary */}
      {myPick && (
        <div className={`rounded-xl p-4 mb-6 ${
          (myPick.points_earned || 0) > 0
            ? 'bg-green-500/20 border border-green-500/30'
            : (myPick.points_earned || 0) < 0
            ? 'bg-red-500/20 border border-red-500/30'
            : 'bg-white/5 border border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-burgundy-200 text-sm">Your Pick</p>
              <p className="text-white font-bold text-lg">{myPick.castaways?.name}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                {(myPick.points_earned || 0) > 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-400" />
                ) : (myPick.points_earned || 0) < 0 ? (
                  <TrendingDown className="h-5 w-5 text-red-400" />
                ) : (
                  <Minus className="h-5 w-5 text-burgundy-400" />
                )}
                <span className={`text-2xl font-bold ${
                  (myPick.points_earned || 0) > 0
                    ? 'text-green-400'
                    : (myPick.points_earned || 0) < 0
                    ? 'text-red-400'
                    : 'text-white'
                }`}>
                  {(myPick.points_earned || 0) > 0 ? '+' : ''}{myPick.points_earned || 0}
                </span>
              </div>
              <p className="text-burgundy-300 text-sm">points</p>
            </div>
          </div>
        </div>
      )}

      {/* League Picks Leaderboard */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-6">
        <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gold-500" />
          Episode Standings
        </h2>

        {picks && picks.length > 0 ? (
          <div className="space-y-2">
            {picks.map((pick: any, index: number) => (
              <div
                key={pick.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  pick.user_id === currentUser?.id
                    ? 'bg-gold-500/20 border border-gold-500/30'
                    : 'bg-burgundy-800/50'
                }`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  {index === 0 ? (
                    <Trophy className="h-5 w-5 text-gold-500" />
                  ) : (
                    <span className="text-burgundy-300 font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{pick.users?.display_name}</p>
                  <p className="text-burgundy-300 text-sm">{pick.castaways?.name}</p>
                </div>
                <span className={`font-bold ${
                  (pick.points_earned || 0) > 0
                    ? 'text-green-400'
                    : (pick.points_earned || 0) < 0
                    ? 'text-red-400'
                    : 'text-burgundy-300'
                }`}>
                  {(pick.points_earned || 0) > 0 ? '+' : ''}{pick.points_earned || 0}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-burgundy-300 text-center py-4">No picks for this episode yet.</p>
        )}
      </div>

      {/* Castaway Scoring Breakdown */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-gold-500" />
          Scoring Breakdown
        </h2>

        {Object.keys(scoresByCastaway).length > 0 ? (
          <div className="space-y-4">
            {Object.values(scoresByCastaway)
              .sort((a: any, b: any) => b.total - a.total)
              .map((data: any) => (
                <div key={data.castaway.id} className="bg-burgundy-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {data.castaway.photo_url ? (
                        <img
                          src={data.castaway.photo_url}
                          alt={data.castaway.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-burgundy-700 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-burgundy-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{data.castaway.name}</p>
                        <p className="text-burgundy-300 text-sm">{data.castaway.tribe_original}</p>
                      </div>
                    </div>
                    <span className={`text-xl font-bold ${
                      data.total > 0 ? 'text-green-400' : data.total < 0 ? 'text-red-400' : 'text-white'
                    }`}>
                      {data.total > 0 ? '+' : ''}{data.total}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {data.scores.map((score: any) => (
                      <div key={score.id} className="flex items-center justify-between text-sm">
                        <span className="text-burgundy-200">
                          {score.scoring_rules?.name}
                          {score.quantity > 1 && ` (x${score.quantity})`}
                        </span>
                        <span className={score.points >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {score.points >= 0 ? '+' : ''}{score.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-burgundy-300 text-center py-8">
            {episode?.is_scored
              ? 'No scores recorded for this episode.'
              : 'Scoring not yet finalized. Check back after Friday at noon!'}
          </p>
        )}
      </div>
    </div>
  );
}
