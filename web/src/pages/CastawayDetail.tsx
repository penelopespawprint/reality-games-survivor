/**
 * Castaway Detail Page
 *
 * Shows detailed information about a specific castaway including
 * their photo, bio, fun facts, and week-over-week scoring performance.
 */

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import {
  Loader2,
  ArrowLeft,
  MapPin,
  Briefcase,
  Calendar,
  Skull,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
} from 'lucide-react';
import type { Castaway } from '@/types';

interface EpisodeScore {
  episode_id: string;
  points: number;
  episode: {
    number: number;
    title: string | null;
    air_date: string;
  };
}

interface CastawayRanking {
  castaway_id: string;
  total_points: number;
  rank: number;
}

export default function CastawayDetail() {
  const { id } = useParams<{ id: string }>();

  // Fetch castaway details
  const {
    data: castaway,
    isLoading: castawayLoading,
    error: castawayError,
  } = useQuery({
    queryKey: ['castaway', id],
    queryFn: async () => {
      if (!id) throw new Error('No castaway ID');
      const { data, error } = await supabase
        .from('castaways')
        .select('*, seasons(number, name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Castaway & { seasons: { number: number; name: string } };
    },
    enabled: !!id,
  });

  // Fetch episode scores for this castaway (aggregated by episode)
  const { data: episodeScores } = useQuery({
    queryKey: ['castaway-scores', id],
    queryFn: async () => {
      if (!id) return [];
      // Get all scoring events for this castaway
      const { data, error } = await supabase
        .from('episode_scores')
        .select(
          `
          episode_id,
          points,
          episodes!inner (
            number,
            title,
            air_date
          )
        `
        )
        .eq('castaway_id', id)
        .order('episodes(number)', { ascending: true });
      if (error) throw error;

      // Aggregate points by episode
      const episodeMap = new Map<string, { episode_id: string; points: number; episode: any }>();
      (data || []).forEach((score: any) => {
        const existing = episodeMap.get(score.episode_id);
        if (existing) {
          existing.points += Number(score.points);
        } else {
          episodeMap.set(score.episode_id, {
            episode_id: score.episode_id,
            points: Number(score.points),
            episode: score.episodes,
          });
        }
      });

      return Array.from(episodeMap.values()) as EpisodeScore[];
    },
    enabled: !!id,
  });

  // Fetch all castaways for ranking
  const { data: rankings } = useQuery({
    queryKey: ['castaway-rankings', castaway?.season_id],
    queryFn: async () => {
      if (!castaway?.season_id) return [];

      // Get total points for each castaway in the season
      const { data, error } = await supabase
        .from('episode_scores')
        .select('castaway_id, points, castaways!inner(season_id)')
        .eq('castaways.season_id', castaway.season_id);

      if (error) throw error;

      // Aggregate points by castaway
      const pointsBycastaway: Record<string, number> = {};
      (data || []).forEach((score: any) => {
        pointsBycastaway[score.castaway_id] =
          (pointsBycastaway[score.castaway_id] || 0) + Number(score.points);
      });

      // Sort and rank
      const sorted = Object.entries(pointsBycastaway)
        .map(([castaway_id, total_points]) => ({ castaway_id, total_points }))
        .sort((a, b) => b.total_points - a.total_points)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      return sorted as CastawayRanking[];
    },
    enabled: !!castaway?.season_id,
  });

  // Fetch total castaway count for the season
  const { data: castawayCount } = useQuery({
    queryKey: ['castaway-count', castaway?.season_id],
    queryFn: async () => {
      if (!castaway?.season_id) return 24; // Default to 24
      const { count, error } = await supabase
        .from('castaways')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', castaway.season_id);
      if (error) throw error;
      return count || 24;
    },
    enabled: !!castaway?.season_id,
  });

  // Fetch total confessional count for this castaway
  const { data: confessionalCount } = useQuery({
    queryKey: ['castaway-confessionals', id],
    queryFn: async () => {
      if (!id) return 0;
      // Get the confessional rule ID
      const { data: rule } = await supabase
        .from('scoring_rules')
        .select('id')
        .eq('code', 'RAND_CONFESSIONAL')
        .single();

      if (!rule) return 0;

      // Sum the quantity of confessional scores for this castaway
      const { data: scores, error } = await supabase
        .from('episode_scores')
        .select('quantity')
        .eq('castaway_id', id)
        .eq('scoring_rule_id', rule.id);

      if (error) throw error;

      // Sum up all confessional quantities
      return (scores || []).reduce((sum, s) => sum + (s.quantity || 1), 0);
    },
    enabled: !!id,
  });

  // Calculate total points and rank for this castaway
  const totalPoints = episodeScores?.reduce((sum, score) => sum + score.points, 0) || 0;
  const castawayRank = rankings?.find((r) => r.castaway_id === id)?.rank || null;
  const totalCastaways = castawayCount || 24;

  // Get tribe color
  const getTribeColor = (tribe: string | null) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      Vatu: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
      Kalo: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
      Cila: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    };
    return (
      colors[tribe || ''] || {
        bg: 'bg-neutral-100',
        text: 'text-neutral-700',
        border: 'border-neutral-300',
      }
    );
  };

  if (castawayLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (castawayError || !castaway) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-card p-8 text-center max-w-md">
            <Skull className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-2">
              Castaway Not Found
            </h2>
            <p className="text-neutral-600 mb-4">
              This castaway doesn't exist or has been removed.
            </p>
            <Link to="/castaways" className="btn btn-primary">
              View All Castaways
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const tribeColors = getTribeColor(castaway.tribe_original);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {/* Back Link */}
        <Link
          to="/castaways"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-burgundy-600 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Castaways
        </Link>

        {/* Hero Section - Large Photo Layout */}
        <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden mb-6">
          <div className="lg:flex">
            {/* Large Photo */}
            <div className="lg:w-2/5 relative">
              {castaway.photo_url ? (
                <img
                  src={castaway.photo_url}
                  alt={castaway.name}
                  className="w-full h-80 lg:h-full lg:min-h-[500px] object-cover object-top"
                />
              ) : (
                <div className="w-full h-80 lg:h-full lg:min-h-[500px] bg-gradient-to-br from-burgundy-400 to-burgundy-600 flex items-center justify-center">
                  <span className="text-8xl text-white/80 font-display">
                    {castaway.name.charAt(0)}
                  </span>
                </div>
              )}
              {/* Status Badge (only show for eliminated/winner on photo) */}
              {castaway.status === 'eliminated' && (
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-1.5 bg-neutral-800/90 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    <Skull className="h-4 w-4" />
                    Eliminated
                  </div>
                </div>
              )}
              {castaway.status === 'winner' && (
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-1.5 bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    <Trophy className="h-4 w-4" />
                    Winner
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="lg:w-3/5 p-6 lg:p-8 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${tribeColors.bg} ${tribeColors.text} ${tribeColors.border} border`}
                  >
                    {castaway.tribe_original || 'Unknown Tribe'}
                  </div>
                  {castaway.status === 'active' && (
                    <span className="text-sm font-semibold text-green-600">
                      Active
                    </span>
                  )}
                </div>
                <h1 className="text-4xl font-display font-bold text-neutral-800">
                  {castaway.name}
                </h1>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {castaway.age && (
                  <div className="bg-cream-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Calendar className="h-5 w-5 text-burgundy-500" />
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wide">Age</p>
                        <p className="font-semibold text-neutral-800">{castaway.age} years old</p>
                      </div>
                    </div>
                  </div>
                )}
                {castaway.hometown && (
                  <div className="bg-cream-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-neutral-600">
                      <MapPin className="h-5 w-5 text-burgundy-500" />
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wide">From</p>
                        <p className="font-semibold text-neutral-800">{castaway.hometown}</p>
                      </div>
                    </div>
                  </div>
                )}
                {castaway.occupation && (
                  <div className="bg-cream-50 rounded-xl p-4 col-span-2">
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Briefcase className="h-5 w-5 text-burgundy-500" />
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wide">
                          Occupation
                        </p>
                        <p className="font-semibold text-neutral-800">{castaway.occupation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fun Fact */}
              {castaway.fun_fact && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <Star className="h-6 w-6 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-800 mb-1">Fun Fact</p>
                      <div
                        className="text-amber-700 leading-relaxed prose prose-sm max-w-none prose-amber"
                        dangerouslySetInnerHTML={{ __html: castaway.fun_fact }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Seasons */}
              {castaway.previous_seasons && castaway.previous_seasons.length > 0 && (
                <div className="bg-burgundy-50 border border-burgundy-200 rounded-xl p-4 mt-auto">
                  <p className="font-semibold text-burgundy-800 mb-2">Survivor Veteran</p>
                  <p className="text-burgundy-700">
                    Previous seasons: {castaway.previous_seasons.join(', ')}
                    {castaway.best_placement && (
                      <span className="ml-2 font-semibold">
                        (Best finish: #{castaway.best_placement})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Points Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 text-center">
            <p className="text-3xl font-bold text-burgundy-600">{totalPoints}</p>
            <p className="text-neutral-500 text-sm">Total Points</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 text-center">
            <p className="text-3xl font-bold text-neutral-800">
              {castawayRank ? `#${castawayRank}` : '-'}
            </p>
            <p className="text-neutral-500 text-sm">of {totalCastaways} Castaways</p>
          </div>
          {(confessionalCount || 0) >= 1 ? (
            <Link
              to="/scoring"
              className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 text-center hover:shadow-lg hover:border-burgundy-200 transition-all"
            >
              <p className="text-3xl font-bold text-burgundy-600">{confessionalCount || 0}</p>
              <p className="text-neutral-500 text-sm">Season 50 Confessionals</p>
            </Link>
          ) : (
            <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 text-center">
              <p className="text-3xl font-bold text-neutral-800">0</p>
              <p className="text-neutral-500 text-sm">Season 50 Confessionals</p>
            </div>
          )}
        </div>

        {/* Week-over-Week Performance */}
        <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
          <div className="p-5 border-b border-cream-100">
            <h2 className="text-lg font-display font-bold text-neutral-800">
              Week-over-Week Performance
            </h2>
          </div>

          {episodeScores && episodeScores.length > 0 ? (
            <div className="divide-y divide-cream-100">
              {episodeScores.map((score, index) => {
                const prevScore = index > 0 ? episodeScores[index - 1].points : null;
                const trend =
                  prevScore !== null
                    ? score.points > prevScore
                      ? 'up'
                      : score.points < prevScore
                        ? 'down'
                        : 'same'
                    : null;

                return (
                  <div
                    key={score.episode_id}
                    className="p-4 flex items-center justify-between hover:bg-cream-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-burgundy-100 flex items-center justify-center">
                        <span className="font-bold text-burgundy-600">{score.episode.number}</span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800">
                          Episode {score.episode.number}
                          {score.episode.title && (
                            <span className="text-neutral-500 ml-2">- {score.episode.title}</span>
                          )}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {new Date(score.episode.air_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {trend && (
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            trend === 'up'
                              ? 'text-green-600'
                              : trend === 'down'
                                ? 'text-red-600'
                                : 'text-neutral-400'
                          }`}
                        >
                          {trend === 'up' && <TrendingUp className="h-4 w-4" />}
                          {trend === 'down' && <TrendingDown className="h-4 w-4" />}
                          {trend === 'same' && <Minus className="h-4 w-4" />}
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xl font-bold text-neutral-800">{score.points}</p>
                        <p className="text-xs text-neutral-400">points</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-neutral-500">
              <p>No scoring data available yet.</p>
              <p className="text-sm mt-1">Check back after episodes air!</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
