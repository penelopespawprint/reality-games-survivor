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
  Calendar,
  Flame,
  Skull,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  History,
  Award,
  Sparkles,
} from 'lucide-react';
import type { Castaway } from '@/types';
import { getAvatarUrl } from '@/lib/avatar';

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

// Tribe configuration
const tribeConfig: Record<
  string,
  { name: string; primary: string; secondary: string; gradient: string }
> = {
  Vatu: {
    name: 'Vatu',
    primary: '#7C3AED',
    secondary: '#EDE9FE',
    gradient: 'from-violet-600 to-purple-700',
  },
  Kalo: {
    name: 'Kalo',
    primary: '#0D9488',
    secondary: '#CCFBF1',
    gradient: 'from-teal-500 to-emerald-600',
  },
  Cila: {
    name: 'Cila',
    primary: '#EA580C',
    secondary: '#FFEDD5',
    gradient: 'from-orange-500 to-amber-600',
  },
};

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

  // Fetch episode scores for this castaway
  const { data: episodeScores } = useQuery({
    queryKey: ['castaway-scores', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('castaway_scores')
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
      return (data || []).map((score: any) => ({
        episode_id: score.episode_id,
        points: score.points,
        episode: score.episodes,
      })) as EpisodeScore[];
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
        .from('castaway_scores')
        .select('castaway_id, points, castaways!inner(season_id)')
        .eq('castaways.season_id', castaway.season_id);

      if (error) throw error;

      // Aggregate points by castaway
      const pointsBycastaway: Record<string, number> = {};
      (data || []).forEach((score: any) => {
        pointsBycastaway[score.castaway_id] =
          (pointsBycastaway[score.castaway_id] || 0) + score.points;
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

  // Calculate total points and rank for this castaway
  const totalPoints = episodeScores?.reduce((sum, score) => sum + score.points, 0) || 0;
  const castawayRank = rankings?.find((r) => r.castaway_id === id)?.rank || null;
  const totalCastaways = rankings?.length || 0;

  // Get tribe info
  const getTribeInfo = (tribe: string | null | undefined) => {
    return (
      tribeConfig[tribe || ''] || {
        name: 'Unknown',
        primary: '#6B7280',
        secondary: '#F3F4F6',
        gradient: 'from-gray-500 to-gray-600',
      }
    );
  };

  if (castawayLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (castawayError || !castaway) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-stone-800/50 backdrop-blur rounded-2xl border border-stone-700/50 p-8 text-center max-w-md">
            <Skull className="h-12 w-12 text-stone-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-200 mb-2">Castaway Not Found</h2>
            <p className="text-stone-400 mb-6">This castaway doesn't exist or has been removed.</p>
            <Link
              to="/castaways"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold rounded-xl transition-colors"
            >
              View All Castaways
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const tribeInfo = getTribeInfo(castaway.tribe_original);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        {/* Back Link */}
        <Link
          to="/castaways"
          className="inline-flex items-center gap-2 text-stone-400 hover:text-amber-500 mb-6 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Castaways
        </Link>

        {/* Hero Section */}
        <div className="bg-stone-800/50 backdrop-blur rounded-3xl border border-stone-700/50 overflow-hidden mb-8">
          <div className="md:flex">
            {/* Photo Section */}
            <div className="md:w-2/5 relative">
              <div
                className={`aspect-[3/4] ${castaway.status === 'eliminated' ? 'grayscale' : ''}`}
              >
                <img
                  src={getAvatarUrl(castaway.name, castaway.photo_url)}
                  alt={castaway.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (castaway.photo_url && !target.src.includes('dicebear')) {
                      target.src = getAvatarUrl(castaway.name, null);
                    }
                  }}
                />
              </div>
              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                {castaway.status === 'eliminated' ? (
                  <div className="flex items-center gap-1.5 bg-stone-800/90 text-stone-300 px-4 py-2 rounded-full text-sm font-medium backdrop-blur">
                    <Skull className="h-4 w-4" />
                    Eliminated
                  </div>
                ) : castaway.status === 'winner' ? (
                  <div className="flex items-center gap-1.5 bg-amber-500 text-stone-900 px-4 py-2 rounded-full text-sm font-bold">
                    <Trophy className="h-4 w-4" />
                    Winner
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    <Flame className="h-4 w-4" />
                    Active
                  </div>
                )}
              </div>
              {/* Tribe color accent */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tribeInfo.gradient}`}
              />
            </div>

            {/* Info Section */}
            <div className="md:w-3/5 p-6 md:p-8">
              {/* Name & Tribe */}
              <div className="mb-6">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-3`}
                  style={{ backgroundColor: tribeInfo.secondary, color: tribeInfo.primary }}
                >
                  {tribeInfo.name} Tribe
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                  {castaway.name}
                </h1>
                {castaway.occupation && (
                  <p className="text-xl text-stone-400">{castaway.occupation}</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {castaway.age && (
                  <div className="flex items-center gap-3 text-stone-300">
                    <div className="w-10 h-10 rounded-xl bg-stone-700/50 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Age</p>
                      <p className="font-semibold">{castaway.age}</p>
                    </div>
                  </div>
                )}
                {castaway.hometown && (
                  <div className="flex items-center gap-3 text-stone-300">
                    <div className="w-10 h-10 rounded-xl bg-stone-700/50 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Hometown</p>
                      <p className="font-semibold">{castaway.hometown}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bio */}
              {castaway.bio && (
                <div className="mb-6">
                  <p className="text-stone-400 leading-relaxed">{castaway.bio}</p>
                </div>
              )}

              {/* Fun Fact */}
              {castaway.fun_fact && (
                <div className="bg-gradient-to-r from-amber-900/30 to-stone-800/30 border border-amber-700/30 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-400 mb-1">Fun Fact</p>
                      <p className="text-stone-300">{castaway.fun_fact}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Seasons */}
              {castaway.previous_seasons && castaway.previous_seasons.length > 0 && (
                <div className="bg-stone-700/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-5 w-5 text-amber-500" />
                    <span className="font-semibold text-stone-200">
                      {castaway.previous_seasons.length} Previous Season
                      {castaway.previous_seasons.length > 1 ? 's' : ''}
                    </span>
                    {castaway.best_placement && (
                      <span className="ml-auto flex items-center gap-1 text-sm">
                        <Award className="h-4 w-4 text-amber-500" />
                        <span
                          className={
                            castaway.best_placement === 1
                              ? 'text-amber-400 font-semibold'
                              : 'text-stone-400'
                          }
                        >
                          Best:{' '}
                          {castaway.best_placement === 1 ? 'Winner' : `#${castaway.best_placement}`}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {castaway.previous_seasons.map((season: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-sm bg-stone-600/50 text-stone-300 px-3 py-1 rounded-full"
                      >
                        {season}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Points Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-stone-800/50 backdrop-blur rounded-2xl border border-stone-700/50 p-6 text-center">
            <p className="text-4xl font-black text-amber-500">{totalPoints}</p>
            <p className="text-stone-500 text-sm uppercase tracking-wider mt-1">Total Points</p>
          </div>
          <div className="bg-stone-800/50 backdrop-blur rounded-2xl border border-stone-700/50 p-6 text-center">
            <p className="text-4xl font-black text-white">
              {castawayRank ? `#${castawayRank}` : '-'}
            </p>
            <p className="text-stone-500 text-sm uppercase tracking-wider mt-1">
              of {totalCastaways}
            </p>
          </div>
          <div className="bg-stone-800/50 backdrop-blur rounded-2xl border border-stone-700/50 p-6 text-center">
            <p className="text-4xl font-black text-white">{episodeScores?.length || 0}</p>
            <p className="text-stone-500 text-sm uppercase tracking-wider mt-1">Episodes</p>
          </div>
        </div>

        {/* Week-over-Week Performance */}
        <div className="bg-stone-800/50 backdrop-blur rounded-2xl border border-stone-700/50 overflow-hidden">
          <div className="p-6 border-b border-stone-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Week-over-Week Performance
            </h2>
          </div>

          {episodeScores && episodeScores.length > 0 ? (
            <div className="divide-y divide-stone-700/50">
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
                    className="p-4 flex items-center justify-between hover:bg-stone-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg bg-gradient-to-br ${tribeInfo.gradient} text-white`}
                      >
                        {score.episode.number}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          Episode {score.episode.number}
                          {score.episode.title && (
                            <span className="text-stone-400 ml-2">— {score.episode.title}</span>
                          )}
                        </p>
                        <p className="text-sm text-stone-500">
                          {new Date(score.episode.air_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {trend && (
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            trend === 'up'
                              ? 'text-green-500'
                              : trend === 'down'
                                ? 'text-red-500'
                                : 'text-stone-500'
                          }`}
                        >
                          {trend === 'up' && <TrendingUp className="h-4 w-4" />}
                          {trend === 'down' && <TrendingDown className="h-4 w-4" />}
                          {trend === 'same' && <Minus className="h-4 w-4" />}
                        </div>
                      )}
                      <div className="text-right">
                        <p
                          className={`text-2xl font-bold ${score.points >= 0 ? 'text-green-500' : 'text-red-500'}`}
                        >
                          {score.points >= 0 ? '+' : ''}
                          {score.points}
                        </p>
                        <p className="text-xs text-stone-500 uppercase tracking-wider">points</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Star className="h-12 w-12 text-stone-600 mx-auto mb-4" />
              <p className="text-stone-400 mb-1">No scoring data available yet.</p>
              <p className="text-sm text-stone-500">Check back after episodes air!</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
