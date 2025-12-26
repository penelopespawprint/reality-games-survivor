import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Star,
  Target,
  Flame,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';
import { getAvatarUrl } from '@/lib/avatar';

// Category colors and icons
const categoryConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  Challenges: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: <Target className="h-3 w-3" />,
  },
  Strategy: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: <Zap className="h-3 w-3" />,
  },
  Social: { color: 'text-pink-600', bgColor: 'bg-pink-50', icon: <Users className="h-3 w-3" /> },
  Survival: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: <Shield className="h-3 w-3" />,
  },
  Tribal: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: <Flame className="h-3 w-3" />,
  },
  Bonus: { color: 'text-amber-600', bgColor: 'bg-amber-50', icon: <Star className="h-3 w-3" /> },
};

export default function EpisodeResults() {
  const { leagueId, episodeId } = useParams<{ leagueId: string; episodeId: string }>();
  const [expandedCastaway, setExpandedCastaway] = useState<string | null>(null);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch castaways eliminated in this episode
  const { data: eliminatedCastaways } = useQuery({
    queryKey: ['eliminated-castaways', episodeId],
    queryFn: async () => {
      if (!episodeId) return [];
      const { data, error } = await supabase
        .from('castaways')
        .select('id, name, photo_url')
        .eq('eliminated_episode_id', episodeId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!episodeId,
  });

  // Group scores by castaway
  const scoresByCastaway =
    scores?.reduce((acc: Record<string, any>, score) => {
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

  const myPick = picks?.find((p) => p.user_id === currentUser?.id);

  // Check if user's picked castaway was eliminated
  const myPickWasEliminated =
    myPick && eliminatedCastaways?.some((c) => c.id === myPick.castaway_id);

  if (episodeLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
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
            to={`/leagues/${leagueId}`}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800">
              Episode {episode?.number} Results
            </h1>
            <p className="text-neutral-500">{episode?.title || league?.name}</p>
          </div>
        </div>

        {/* Elimination Alert */}
        {eliminatedCastaways && eliminatedCastaways.length > 0 && (
          <div
            className={`rounded-xl p-4 mb-6 ${
              myPickWasEliminated
                ? 'bg-red-50 border-2 border-red-300'
                : 'bg-orange-50 border border-orange-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-full ${myPickWasEliminated ? 'bg-red-100' : 'bg-orange-100'}`}
              >
                <XCircle
                  className={`h-5 w-5 ${myPickWasEliminated ? 'text-red-600' : 'text-orange-600'}`}
                />
              </div>
              <div>
                <p
                  className={`font-bold ${myPickWasEliminated ? 'text-red-800' : 'text-orange-800'}`}
                >
                  {eliminatedCastaways.length === 1
                    ? 'Castaway Eliminated'
                    : `${eliminatedCastaways.length} Castaways Eliminated`}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {eliminatedCastaways.map((castaway) => (
                    <div
                      key={castaway.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                        myPick?.castaway_id === castaway.id
                          ? 'bg-red-100 border border-red-300'
                          : 'bg-white border border-orange-200'
                      }`}
                    >
                      <img
                        src={getAvatarUrl(castaway.name, castaway.photo_url)}
                        alt={castaway.name}
                        className="w-6 h-6 rounded-full object-cover grayscale"
                      />
                      <span
                        className={`text-sm font-medium ${
                          myPick?.castaway_id === castaway.id ? 'text-red-700' : 'text-neutral-700'
                        }`}
                      >
                        {castaway.name}
                        {myPick?.castaway_id === castaway.id && (
                          <span className="ml-1 text-xs text-red-500">(Your Pick)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {myPickWasEliminated && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    This castaway is no longer available for future picks
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* My Pick Summary */}
        {myPick && (
          <div
            className={`rounded-xl p-4 mb-6 ${
              (myPick.points_earned || 0) > 0
                ? 'bg-green-50 border border-green-200'
                : (myPick.points_earned || 0) < 0
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-white border border-cream-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-500 text-sm">Your Pick</p>
                <p className="text-neutral-800 font-bold text-lg">{myPick.castaways?.name}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  {(myPick.points_earned || 0) > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (myPick.points_earned || 0) < 0 ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : (
                    <Minus className="h-5 w-5 text-neutral-400" />
                  )}
                  <span
                    className={`text-2xl font-bold ${
                      (myPick.points_earned || 0) > 0
                        ? 'text-green-600'
                        : (myPick.points_earned || 0) < 0
                          ? 'text-red-600'
                          : 'text-neutral-800'
                    }`}
                  >
                    {(myPick.points_earned || 0) > 0 ? '+' : ''}
                    {myPick.points_earned || 0}
                  </span>
                </div>
                <p className="text-neutral-500 text-sm">points</p>
              </div>
            </div>
          </div>
        )}

        {/* League Picks Leaderboard */}
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 mb-6">
          <h2 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Episode Standings
          </h2>

          {picks && picks.length > 0 ? (
            <div className="space-y-2">
              {picks.map((pick: any, index: number) => (
                <div
                  key={pick.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    pick.user_id === currentUser?.id
                      ? 'bg-burgundy-50 border border-burgundy-200'
                      : 'bg-cream-50 border border-cream-200'
                  }`}
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    {index === 0 ? (
                      <Trophy className="h-5 w-5 text-amber-500" />
                    ) : (
                      <span className="text-neutral-500 font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-neutral-800 font-medium">{pick.users?.display_name}</p>
                    <p className="text-neutral-500 text-sm">{pick.castaways?.name}</p>
                  </div>
                  <span
                    className={`font-bold ${
                      (pick.points_earned || 0) > 0
                        ? 'text-green-600'
                        : (pick.points_earned || 0) < 0
                          ? 'text-red-600'
                          : 'text-neutral-500'
                    }`}
                  >
                    {(pick.points_earned || 0) > 0 ? '+' : ''}
                    {pick.points_earned || 0}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 text-center py-4">No picks for this episode yet.</p>
          )}
        </div>

        {/* Castaway Scoring Breakdown */}
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200">
          <h2 className="text-lg font-display font-bold text-neutral-800 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-burgundy-500" />
            Scoring Breakdown
          </h2>

          {Object.keys(scoresByCastaway).length > 0 ? (
            <div className="space-y-3">
              {Object.values(scoresByCastaway)
                .sort((a: any, b: any) => b.total - a.total)
                .map((data: any) => {
                  const isExpanded = expandedCastaway === data.castaway.id;
                  const isMyPick = myPick?.castaway_id === data.castaway.id;

                  // Group scores by category
                  const scoresByCategory = data.scores.reduce(
                    (acc: Record<string, any[]>, score: any) => {
                      const category = score.scoring_rules?.category || 'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(score);
                      return acc;
                    },
                    {}
                  );

                  return (
                    <div
                      key={data.castaway.id}
                      className={`rounded-xl border transition-all ${
                        isMyPick
                          ? 'bg-burgundy-50 border-burgundy-200'
                          : 'bg-cream-50 border-cream-200'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedCastaway(isExpanded ? null : data.castaway.id)}
                        className="w-full p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(data.castaway.name, data.castaway.photo_url)}
                            alt={data.castaway.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className="text-neutral-800 font-medium">{data.castaway.name}</p>
                              {isMyPick && (
                                <span className="text-xs bg-burgundy-100 text-burgundy-700 px-2 py-0.5 rounded-full">
                                  Your Pick
                                </span>
                              )}
                            </div>
                            <p className="text-neutral-500 text-sm">
                              {data.scores.length} scoring event
                              {data.scores.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xl font-bold ${
                              data.total > 0
                                ? 'text-green-600'
                                : data.total < 0
                                  ? 'text-red-600'
                                  : 'text-neutral-800'
                            }`}
                          >
                            {data.total > 0 ? '+' : ''}
                            {data.total}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-neutral-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4">
                          {Object.entries(scoresByCategory).map(([category, categoryScores]) => {
                            const config = categoryConfig[category] || {
                              color: 'text-neutral-600',
                              bgColor: 'bg-neutral-50',
                              icon: null,
                            };
                            const categoryTotal = (categoryScores as any[]).reduce(
                              (sum, s) => sum + s.points,
                              0
                            );

                            return (
                              <div key={category}>
                                <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                                  {config.icon}
                                  <span className="text-sm font-medium">{category}</span>
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor}`}
                                  >
                                    {categoryTotal > 0 ? '+' : ''}
                                    {categoryTotal}
                                  </span>
                                </div>
                                <div className="space-y-1 pl-5">
                                  {(categoryScores as any[]).map((score) => (
                                    <div
                                      key={score.id}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-neutral-700">
                                          {score.scoring_rules?.name}
                                        </span>
                                        {score.quantity > 1 && (
                                          <span className="text-xs bg-cream-200 text-neutral-600 px-1.5 py-0.5 rounded">
                                            ×{score.quantity}
                                          </span>
                                        )}
                                      </div>
                                      <span
                                        className={`font-medium ${
                                          score.points >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}
                                      >
                                        {score.points >= 0 ? '+' : ''}
                                        {score.points}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-neutral-500 text-center py-8">
              {episode?.is_scored
                ? 'No scores recorded for this episode.'
                : 'Scoring not yet finalized. Check back after Friday at noon!'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
