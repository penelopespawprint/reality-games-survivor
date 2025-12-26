import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/avatar';
import {
  Users,
  Trophy,
  Skull,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Flame,
  MapPin,
  Briefcase,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  History,
  Award,
  Sparkles,
} from 'lucide-react';

interface _Castaway {
  id: string;
  name: string;
  age: number | null;
  hometown: string | null;
  occupation: string | null;
  photo_url: string | null;
  status: 'active' | 'eliminated' | 'winner';
  placement: number | null;
  episodes: { number: number } | null;
  previous_seasons: string[] | null;
  best_placement: number | null;
  fun_fact: string | null;
}

interface EpisodeScoreData {
  castaway_id: string;
  episode_id: string;
  points: number;
  episode: {
    number: number;
    title: string | null;
  };
}

export default function Castaways() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'eliminated'>('all');
  const [expandedCastaway, setExpandedCastaway] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'status'>('name');

  // Fetch active season
  const { data: season, isLoading: seasonLoading } = useQuery({
    queryKey: ['active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch castaways for this season
  const { data: castaways, isLoading: castawaysLoading } = useQuery({
    queryKey: ['season-castaways', season?.id],
    queryFn: async () => {
      if (!season?.id) return [];
      const { data, error } = await supabase
        .from('castaways')
        .select('*, episodes:eliminated_episode_id(number)')
        .eq('season_id', season.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!season?.id,
  });

  // Fetch episode scores for all castaways
  const { data: allScores } = useQuery({
    queryKey: ['all-castaway-scores', season?.id],
    queryFn: async () => {
      if (!season?.id) return [];
      const { data: episodes } = await supabase
        .from('episodes')
        .select('id')
        .eq('season_id', season.id);

      if (!episodes?.length) return [];

      const episodeIds = episodes.map((e) => e.id);

      const { data, error } = await supabase
        .from('episode_scores')
        .select(
          `
          castaway_id,
          episode_id,
          points,
          episode:episodes!episode_id(number, title)
        `
        )
        .in('episode_id', episodeIds);

      if (error) throw error;
      return (data || []) as EpisodeScoreData[];
    },
    enabled: !!season?.id,
  });

  // Aggregate scores by castaway
  const castawayStats =
    allScores?.reduce(
      (
        acc: Record<
          string,
          {
            total: number;
            byEpisode: Record<number, number>;
            episodeCount: number;
            trend: 'up' | 'down' | 'neutral';
          }
        >,
        score
      ) => {
        if (!acc[score.castaway_id]) {
          acc[score.castaway_id] = { total: 0, byEpisode: {}, episodeCount: 0, trend: 'neutral' };
        }
        acc[score.castaway_id].total += score.points;

        const epNum = score.episode?.number;
        if (epNum) {
          if (!acc[score.castaway_id].byEpisode[epNum]) {
            acc[score.castaway_id].byEpisode[epNum] = 0;
            acc[score.castaway_id].episodeCount++;
          }
          acc[score.castaway_id].byEpisode[epNum] += score.points;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          total: number;
          byEpisode: Record<number, number>;
          episodeCount: number;
          trend: 'up' | 'down' | 'neutral';
        }
      >
    ) || {};

  // Calculate trends based on last two episodes
  Object.keys(castawayStats).forEach((castawayId) => {
    const stats = castawayStats[castawayId];
    const episodes = Object.entries(stats.byEpisode).sort(([a], [b]) => Number(b) - Number(a));
    if (episodes.length >= 2) {
      const [, lastPoints] = episodes[0];
      const [, prevPoints] = episodes[1];
      if (lastPoints > prevPoints) stats.trend = 'up';
      else if (lastPoints < prevPoints) stats.trend = 'down';
    }
  });

  // Filter and sort castaways
  const filteredCastaways = castaways
    ?.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.occupation?.toLowerCase().includes(search.toLowerCase()) ||
        c.hometown?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && c.status === 'active') ||
        (filter === 'eliminated' && c.status === 'eliminated');
      return matchesSearch && matchesFilter;
    })
    ?.sort((a, b) => {
      if (sortBy === 'points') {
        return (castawayStats[b.id]?.total || 0) - (castawayStats[a.id]?.total || 0);
      }
      if (sortBy === 'status') {
        const statusOrder: Record<string, number> = { winner: 0, active: 1, eliminated: 2 };
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      }
      return a.name.localeCompare(b.name);
    });

  const activeCount = castaways?.filter((c) => c.status === 'active').length || 0;
  const eliminatedCount = castaways?.filter((c) => c.status === 'eliminated').length || 0;

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-neutral-400" />;
  };

  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  if (seasonLoading || castawaysLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-display font-bold text-neutral-800">Castaways</h1>
        </div>
        <p className="text-neutral-500">
          Season {season?.number}: {season?.name} - {castaways?.length || 0} castaways
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 text-center">
          <div className="w-10 h-10 bg-cream-100 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Users className="h-5 w-5 text-burgundy-500" />
          </div>
          <p className="text-3xl font-bold text-neutral-800">{castaways?.length || 0}</p>
          <p className="text-neutral-500 text-sm">Total Castaways</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-card p-4 border border-green-200 text-center">
          <div className="w-10 h-10 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Flame className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          <p className="text-neutral-500 text-sm">Still in the Game</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-card p-4 border border-red-200 text-center">
          <div className="w-10 h-10 bg-red-100 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Skull className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">{eliminatedCount}</p>
          <p className="text-neutral-500 text-sm">Voted Out</p>
        </div>
      </div>

      {/* Search, Filter & Sort */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search castaways by name, occupation, or hometown..."
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="input px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="eliminated">Eliminated</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input px-3 py-2"
          >
            <option value="name">Sort by Name</option>
            <option value="points">Sort by Points</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {/* Castaways Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCastaways?.map((castaway) => {
          const stats = castawayStats[castaway.id];
          const isExpanded = expandedCastaway === castaway.id;

          return (
            <div
              key={castaway.id}
              className={`bg-white rounded-2xl shadow-card border overflow-hidden transition-all hover:shadow-card-hover ${
                castaway.status === 'eliminated'
                  ? 'border-neutral-200'
                  : castaway.status === 'winner'
                    ? 'border-yellow-300 ring-2 ring-yellow-100'
                    : 'border-cream-200'
              }`}
            >
              {/* Header */}
              <div
                className={`p-4 ${castaway.status === 'eliminated' ? 'bg-neutral-50' : 'bg-white'}`}
              >
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={getAvatarUrl(castaway.name, castaway.photo_url)}
                      alt={castaway.name}
                      className={`w-16 h-16 rounded-full object-cover border-2 ${
                        castaway.status === 'eliminated'
                          ? 'border-neutral-200 grayscale'
                          : castaway.status === 'winner'
                            ? 'border-yellow-400'
                            : 'border-burgundy-200'
                      }`}
                    />
                    {/* Status Badge */}
                    <div
                      className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                        castaway.status === 'winner'
                          ? 'bg-yellow-400'
                          : castaway.status === 'eliminated'
                            ? 'bg-neutral-400'
                            : 'bg-green-500'
                      }`}
                    >
                      {castaway.status === 'winner' ? (
                        <Trophy className="h-3 w-3 text-yellow-900" />
                      ) : castaway.status === 'eliminated' ? (
                        <Skull className="h-3 w-3 text-white" />
                      ) : (
                        <Flame className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold text-lg ${
                        castaway.status === 'eliminated' ? 'text-neutral-500' : 'text-neutral-800'
                      }`}
                    >
                      {castaway.name}
                    </h3>
                    {castaway.occupation && (
                      <p className="text-neutral-500 text-sm flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {castaway.occupation}
                      </p>
                    )}
                    {(castaway.age || castaway.hometown) && (
                      <p className="text-neutral-400 text-xs flex items-center gap-1 mt-1">
                        {castaway.age && (
                          <>
                            <Calendar className="h-3 w-3" />
                            {castaway.age}
                          </>
                        )}
                        {castaway.age && castaway.hometown && <span>·</span>}
                        {castaway.hometown && (
                          <>
                            <MapPin className="h-3 w-3" />
                            {castaway.hometown}
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      {stats && getTrendIcon(stats.trend)}
                      <span
                        className={`text-xl font-bold ${
                          (stats?.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stats?.total !== undefined
                          ? (stats.total >= 0 ? '+' : '') + stats.total
                          : '-'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">points</p>
                  </div>
                </div>
              </div>

              {/* Eliminated/Winner Badge */}
              {castaway.status === 'eliminated' && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                  <p className="text-red-600 text-sm flex items-center gap-2">
                    <Skull className="h-4 w-4" />
                    Eliminated Episode {castaway.episodes?.number}
                    {castaway.placement && ` · ${getOrdinal(castaway.placement)} place`}
                  </p>
                </div>
              )}

              {castaway.status === 'winner' && (
                <div className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border-t border-yellow-200">
                  <p className="text-yellow-700 text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Sole Survivor
                  </p>
                </div>
              )}

              {/* Expand Button */}
              <button
                onClick={() => setExpandedCastaway(isExpanded ? null : castaway.id)}
                className="w-full px-4 py-3 bg-cream-50 border-t border-cream-100 flex items-center justify-center gap-2 text-sm text-neutral-600 hover:bg-cream-100 transition-colors"
              >
                {isExpanded ? (
                  <>
                    Hide Details <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    View Week by Week <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="p-4 border-t border-cream-100 bg-cream-50 space-y-4">
                  {/* Trivia Section */}
                  {(castaway.previous_seasons?.length || castaway.fun_fact) && (
                    <div className="space-y-3">
                      {/* Previous Seasons */}
                      {castaway.previous_seasons && castaway.previous_seasons.length > 0 && (
                        <div className="bg-white rounded-lg border border-cream-200 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <History className="h-4 w-4 text-burgundy-500" />
                            <span className="text-sm font-semibold text-neutral-700">
                              {castaway.previous_seasons.length} Previous Season
                              {castaway.previous_seasons.length > 1 ? 's' : ''}
                            </span>
                            {castaway.best_placement && (
                              <span className="ml-auto flex items-center gap-1 text-xs">
                                <Award className="h-3 w-3 text-yellow-500" />
                                <span
                                  className={
                                    castaway.best_placement === 1
                                      ? 'text-yellow-600 font-semibold'
                                      : 'text-neutral-500'
                                  }
                                >
                                  Best:{' '}
                                  {castaway.best_placement === 1
                                    ? 'Winner'
                                    : `${getOrdinal(castaway.best_placement)} place`}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {castaway.previous_seasons.map((season: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-xs bg-cream-100 text-neutral-600 px-2 py-1 rounded-full"
                              >
                                {season}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fun Fact */}
                      {castaway.fun_fact && (
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200 p-3">
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-neutral-700">{castaway.fun_fact}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Weekly Performance */}
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4 text-burgundy-500" />
                      Weekly Performance
                    </h4>

                    {stats?.byEpisode && Object.keys(stats.byEpisode).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(stats.byEpisode)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([epNum, pts]) => (
                            <div
                              key={epNum}
                              className="flex items-center gap-3 p-2 bg-white rounded-lg border border-cream-200"
                            >
                              <div className="w-16 text-center">
                                <p className="text-xs text-neutral-500">Episode</p>
                                <p className="font-bold text-neutral-800">{epNum}</p>
                              </div>
                              <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    Number(pts) >= 0 ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                  style={{
                                    width: `${Math.min((Math.abs(Number(pts)) / 50) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                              <div
                                className={`w-16 text-right font-bold ${
                                  Number(pts) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {Number(pts) >= 0 ? '+' : ''}
                                {pts}
                              </div>
                            </div>
                          ))}

                        {/* Total Summary */}
                        <div className="mt-4 pt-4 border-t border-cream-200 flex justify-between items-center">
                          <span className="font-medium text-neutral-600">Season Total</span>
                          <span
                            className={`text-2xl font-bold ${
                              stats.total >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {stats.total >= 0 ? '+' : ''}
                            {stats.total}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-white rounded-lg border border-cream-200">
                        <Star className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                        <p className="text-neutral-400 text-sm">No scores recorded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCastaways?.length === 0 && (
        <div className="bg-white rounded-2xl shadow-card p-12 border border-cream-200 text-center">
          <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">No castaways found</h3>
          <p className="text-neutral-500">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
}
