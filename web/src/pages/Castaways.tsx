import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import {
  Users,
  Loader2,
  Search,
  Flame,
  Skull,
  Trophy,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Grid3X3,
  LayoutList,
  Zap,
  Crown,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { getAvatarUrl } from '@/lib/avatar';

interface EpisodeScoreData {
  castaway_id: string;
  episode_id: string;
  points: number;
  episode: {
    number: number;
    title: string | null;
  };
}

interface CastawayWithEpisode {
  id: string;
  name: string;
  occupation?: string | null;
  hometown?: string | null;
  status: 'active' | 'eliminated' | 'winner';
  tribe_original?: string | null;
  tribe_current?: string | null;
  photo_url?: string | null;
  age?: number | null;
  bio?: string | null;
  fun_fact?: string | null;
  previous_seasons?: string[] | null;
  best_placement?: number | null;
  episodes?: { number: number } | null;
}

type ViewMode = 'polaroid' | 'magazine' | 'tribal' | 'leaderboard' | 'mosaic';

// Tribe configuration with refined colors
const tribeConfig: Record<
  string,
  { name: string; primary: string; secondary: string; accent: string; gradient: string }
> = {
  Vatu: {
    name: 'Vatu',
    primary: '#7C3AED',
    secondary: '#EDE9FE',
    accent: '#A78BFA',
    gradient: 'from-violet-600 to-purple-700',
  },
  Kalo: {
    name: 'Kalo',
    primary: '#0D9488',
    secondary: '#CCFBF1',
    accent: '#5EEAD4',
    gradient: 'from-teal-500 to-emerald-600',
  },
  Cila: {
    name: 'Cila',
    primary: '#EA580C',
    secondary: '#FFEDD5',
    accent: '#FB923C',
    gradient: 'from-orange-500 to-amber-600',
  },
};

export default function Castaways() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'eliminated'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'status'>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('polaroid');

  // Fetch active season
  const {
    data: season,
    isLoading: seasonLoading,
    error: seasonError,
  } = useQuery({
    queryKey: ['active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
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
        .order('tribe_original', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as CastawayWithEpisode[];
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
        .select(`castaway_id, episode_id, points, episode:episodes!episode_id(number, title)`)
        .in('episode_id', episodeIds);
      if (error) throw error;
      return (data || []) as EpisodeScoreData[];
    },
    enabled: !!season?.id,
  });

  // Aggregate scores by castaway
  const castawayStats = useMemo(() => {
    const stats =
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
        {}
      ) || {};

    // Calculate trends
    Object.keys(stats).forEach((castawayId) => {
      const s = stats[castawayId];
      const episodes = Object.entries(s.byEpisode).sort(([a], [b]) => Number(b) - Number(a));
      if (episodes.length >= 2) {
        const [, lastPoints] = episodes[0];
        const [, prevPoints] = episodes[1];
        if (lastPoints > prevPoints) s.trend = 'up';
        else if (lastPoints < prevPoints) s.trend = 'down';
      }
    });

    return stats;
  }, [allScores]);

  // Filtered and sorted castaways
  const filteredCastaways = useMemo(() => {
    if (!castaways) return [];
    return castaways
      .filter((c) => {
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
      .sort((a, b) => {
        if (sortBy === 'points') {
          return (castawayStats[b.id]?.total || 0) - (castawayStats[a.id]?.total || 0);
        }
        if (sortBy === 'status') {
          const statusOrder: Record<string, number> = { winner: 0, active: 1, eliminated: 2 };
          return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
        }
        return a.name.localeCompare(b.name);
      });
  }, [castaways, castawayStats, filter, search, sortBy]);

  // Group by tribe for tribal view
  const castawaysByTribe = useMemo(() => {
    const grouped: Record<string, CastawayWithEpisode[]> = {};
    filteredCastaways.forEach((castaway) => {
      const tribe = castaway.tribe_original || 'Unknown';
      if (!grouped[tribe]) grouped[tribe] = [];
      grouped[tribe].push(castaway);
    });
    return grouped;
  }, [filteredCastaways]);

  const activeCount = castaways?.filter((c) => c.status === 'active').length || 0;
  const eliminatedCount = castaways?.filter((c) => c.status === 'eliminated').length || 0;

  // Get tribe info for a castaway
  const getTribeInfo = (tribe: string | null | undefined) => {
    return (
      tribeConfig[tribe || ''] || {
        name: 'Unknown',
        primary: '#6B7280',
        secondary: '#F3F4F6',
        accent: '#9CA3AF',
        gradient: 'from-gray-500 to-gray-600',
      }
    );
  };

  if (seasonLoading || castawaysLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (seasonError || !season) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users className="h-12 w-12 text-stone-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-300 mb-2">No Active Season</h2>
            <p className="text-stone-500">Check back when a new season begins!</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ==========================================
  // VIEW MODE COMPONENTS
  // ==========================================

  // VARIATION 1: Polaroid Gallery - Vintage photo wall aesthetic
  const PolaroidView = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {filteredCastaways.map((castaway, index) => {
        const stats = castawayStats[castaway.id];
        const tribe = getTribeInfo(castaway.tribe_original);
        const rotation = ((index % 5) - 2) * 2; // -4 to 4 degrees rotation

        return (
          <Link
            key={castaway.id}
            to={`/castaways/${castaway.id}`}
            className={`group block transition-all duration-300 hover:scale-105 hover:z-10 ${
              castaway.status === 'eliminated'
                ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                : ''
            }`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="bg-stone-100 p-3 pb-12 shadow-xl hover:shadow-2xl transition-shadow rounded-sm relative">
              {/* Photo */}
              <div className="aspect-square overflow-hidden bg-stone-200 relative">
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
                {/* Status indicator */}
                {castaway.status === 'winner' && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white p-1.5 rounded-full">
                    <Trophy className="h-4 w-4" />
                  </div>
                )}
                {castaway.status === 'eliminated' && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                      EP {castaway.episodes?.number || '?'}
                    </span>
                  </div>
                )}
              </div>
              {/* Handwritten-style name */}
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <p className="font-serif text-sm text-stone-700 truncate px-2">{castaway.name}</p>
                <p className="text-xs text-stone-500">{stats?.total ?? 0} pts</p>
              </div>
              {/* Tribe color tape */}
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-3 opacity-80"
                style={{ backgroundColor: tribe.primary }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );

  // VARIATION 2: Magazine Editorial - High fashion editorial layout
  const MagazineView = () => (
    <div className="space-y-16">
      {filteredCastaways.slice(0, 3).map((castaway, index) => {
        const stats = castawayStats[castaway.id];
        const tribe = getTribeInfo(castaway.tribe_original);
        const isEven = index % 2 === 0;

        return (
          <Link
            key={castaway.id}
            to={`/castaways/${castaway.id}`}
            className={`group block ${castaway.status === 'eliminated' ? 'opacity-70' : ''}`}
          >
            <div
              className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-center`}
            >
              {/* Large Photo */}
              <div className="w-full md:w-1/2 relative">
                <div
                  className={`aspect-[3/4] overflow-hidden ${castaway.status === 'eliminated' ? 'grayscale' : ''}`}
                >
                  <img
                    src={getAvatarUrl(castaway.name, castaway.photo_url)}
                    alt={castaway.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (castaway.photo_url && !target.src.includes('dicebear')) {
                        target.src = getAvatarUrl(castaway.name, null);
                      }
                    }}
                  />
                </div>
                {/* Issue number style overlay */}
                <div className="absolute bottom-4 right-4 text-right">
                  <p className="text-7xl font-black text-white/20 leading-none">#{index + 1}</p>
                </div>
              </div>
              {/* Editorial Text */}
              <div className="w-full md:w-1/2 space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r ${tribe.gradient} rounded-full`}
                  >
                    {tribe.name}
                  </span>
                  {castaway.status === 'active' && <Flame className="h-4 w-4 text-orange-500" />}
                  {castaway.status === 'eliminated' && <Skull className="h-4 w-4 text-stone-500" />}
                  {castaway.status === 'winner' && <Trophy className="h-4 w-4 text-amber-500" />}
                </div>
                <h2 className="text-5xl md:text-6xl font-black text-stone-100 tracking-tight leading-none">
                  {castaway.name.split(' ')[0]}
                  <span className="block text-3xl md:text-4xl font-light text-stone-400">
                    {castaway.name.split(' ').slice(1).join(' ')}
                  </span>
                </h2>
                <p className="text-stone-400 text-lg">{castaway.occupation || 'Castaway'}</p>
                {castaway.hometown && <p className="text-stone-500">{castaway.hometown}</p>}
                <div className="flex items-baseline gap-2 pt-4">
                  <span className="text-5xl font-black text-amber-500">{stats?.total ?? 0}</span>
                  <span className="text-stone-500 text-sm uppercase tracking-widest">points</span>
                  {stats?.trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500 ml-2" />}
                  {stats?.trend === 'down' && (
                    <TrendingDown className="h-5 w-5 text-red-500 ml-2" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-stone-500 pt-2 group-hover:text-amber-500 transition-colors">
                  <span className="text-sm uppercase tracking-widest">View Profile</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {/* Remaining castaways in a compact grid */}
      {filteredCastaways.length > 3 && (
        <div className="border-t border-stone-700 pt-12">
          <h3 className="text-2xl font-bold text-stone-300 mb-8 uppercase tracking-widest">
            Also Competing
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredCastaways.slice(3).map((castaway) => {
              const stats = castawayStats[castaway.id];
              return (
                <Link
                  key={castaway.id}
                  to={`/castaways/${castaway.id}`}
                  className={`group block ${castaway.status === 'eliminated' ? 'opacity-60' : ''}`}
                >
                  <div
                    className={`aspect-square overflow-hidden mb-2 ${castaway.status === 'eliminated' ? 'grayscale' : ''}`}
                  >
                    <img
                      src={getAvatarUrl(castaway.name, castaway.photo_url)}
                      alt={castaway.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (castaway.photo_url && !target.src.includes('dicebear')) {
                          target.src = getAvatarUrl(castaway.name, null);
                        }
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium text-stone-300 truncate group-hover:text-amber-500 transition-colors">
                    {castaway.name}
                  </p>
                  <p className="text-xs text-stone-500">{stats?.total ?? 0} pts</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // VARIATION 3: Tribal Council - Grouped by tribe with dramatic styling
  const TribalView = () => (
    <div className="space-y-12">
      {Object.entries(castawaysByTribe)
        .sort(([a], [b]) => {
          const order: Record<string, number> = { Vatu: 1, Kalo: 2, Cila: 3, Unknown: 99 };
          return (order[a] || 99) - (order[b] || 99);
        })
        .map(([tribe, tribeCastaways]) => {
          const tribeInfo = getTribeInfo(tribe);
          const tribeActive = tribeCastaways.filter((c) => c.status === 'active').length;
          const tribeEliminated = tribeCastaways.filter((c) => c.status === 'eliminated').length;

          return (
            <div key={tribe} className="relative">
              {/* Tribe Header */}
              <div
                className={`relative overflow-hidden rounded-t-3xl bg-gradient-to-r ${tribeInfo.gradient} p-6 md:p-8`}
              >
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                      {tribeInfo.name} Tribe
                    </h2>
                    <p className="text-white/70 mt-1">
                      {tribeActive} active • {tribeEliminated} eliminated
                    </p>
                  </div>
                  <div className="text-6xl opacity-30">🔥</div>
                </div>
              </div>

              {/* Tribe Members */}
              <div className="bg-stone-800/50 backdrop-blur rounded-b-3xl p-6 border border-stone-700/50 border-t-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {tribeCastaways.map((castaway) => {
                    const stats = castawayStats[castaway.id];

                    return (
                      <Link
                        key={castaway.id}
                        to={`/castaways/${castaway.id}`}
                        className={`group block ${castaway.status === 'eliminated' ? 'opacity-50' : ''}`}
                      >
                        <div className="relative">
                          <div
                            className={`aspect-square rounded-2xl overflow-hidden ring-2 ring-offset-2 ring-offset-stone-800 transition-all group-hover:ring-4 ${
                              castaway.status === 'eliminated' ? 'grayscale ring-stone-600' : ''
                            }`}
                            style={{
                              ringColor:
                                castaway.status === 'eliminated' ? undefined : tribeInfo.primary,
                            }}
                          >
                            <img
                              src={getAvatarUrl(castaway.name, castaway.photo_url)}
                              alt={castaway.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (castaway.photo_url && !target.src.includes('dicebear')) {
                                  target.src = getAvatarUrl(castaway.name, null);
                                }
                              }}
                            />
                          </div>
                          {/* Status badge */}
                          {castaway.status === 'eliminated' && (
                            <div className="absolute -bottom-1 -right-1 bg-stone-700 text-stone-300 text-xs font-bold px-2 py-0.5 rounded-full">
                              EP {castaway.episodes?.number || '?'}
                            </div>
                          )}
                          {castaway.status === 'winner' && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full">
                              <Crown className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="mt-3 text-center">
                          <p className="font-semibold text-stone-200 text-sm truncate group-hover:text-white transition-colors">
                            {castaway.name}
                          </p>
                          <p className="text-xs text-stone-500">{stats?.total ?? 0} pts</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );

  // VARIATION 4: Leaderboard - Points-focused ranking view
  const LeaderboardView = () => {
    const rankedCastaways = [...filteredCastaways].sort(
      (a, b) => (castawayStats[b.id]?.total || 0) - (castawayStats[a.id]?.total || 0)
    );

    return (
      <div className="space-y-3">
        {rankedCastaways.map((castaway, index) => {
          const stats = castawayStats[castaway.id];
          const tribe = getTribeInfo(castaway.tribe_original);
          const rank = index + 1;

          return (
            <Link
              key={castaway.id}
              to={`/castaways/${castaway.id}`}
              className={`group block ${castaway.status === 'eliminated' ? 'opacity-60' : ''}`}
            >
              <div
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[1.01] ${
                  rank <= 3
                    ? 'bg-gradient-to-r from-amber-900/30 to-stone-800/50'
                    : 'bg-stone-800/30'
                } border border-stone-700/50 hover:border-stone-600`}
              >
                {/* Rank */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${
                    rank === 1
                      ? 'bg-amber-500 text-stone-900'
                      : rank === 2
                        ? 'bg-stone-400 text-stone-900'
                        : rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-stone-700 text-stone-400'
                  }`}
                >
                  {rank}
                </div>

                {/* Photo */}
                <div
                  className={`w-14 h-14 rounded-xl overflow-hidden ring-2 ${castaway.status === 'eliminated' ? 'grayscale ring-stone-600' : ''}`}
                  style={{
                    ringColor: castaway.status === 'eliminated' ? undefined : tribe.primary,
                  }}
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-stone-200 truncate group-hover:text-white transition-colors">
                      {castaway.name}
                    </p>
                    {castaway.status === 'active' && (
                      <Flame className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    )}
                    {castaway.status === 'eliminated' && (
                      <Skull className="h-4 w-4 text-stone-500 flex-shrink-0" />
                    )}
                    {castaway.status === 'winner' && (
                      <Trophy className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-500">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: tribe.secondary, color: tribe.primary }}
                    >
                      {tribe.name}
                    </span>
                    <span>{castaway.occupation || 'Castaway'}</span>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-amber-500">{stats?.total ?? 0}</span>
                    {stats?.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {stats?.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider">points</p>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-stone-600 group-hover:text-stone-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  // VARIATION 5: Mosaic - Dynamic masonry-style grid
  const MosaicView = () => {
    const sizes = [
      'col-span-1 row-span-1',
      'col-span-1 row-span-2',
      'col-span-2 row-span-1',
      'col-span-2 row-span-2',
    ];

    return (
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 auto-rows-[120px] gap-3">
        {filteredCastaways.map((castaway, index) => {
          const stats = castawayStats[castaway.id];
          const tribe = getTribeInfo(castaway.tribe_original);
          // Create visual variety - top performers get bigger tiles
          const points = stats?.total || 0;
          let sizeClass = sizes[0];
          if (index === 0 && points > 0) sizeClass = sizes[3];
          else if (index <= 2 && points > 0) sizeClass = sizes[2];
          else if (index <= 5 && points > 0) sizeClass = sizes[1];

          return (
            <Link
              key={castaway.id}
              to={`/castaways/${castaway.id}`}
              className={`group relative overflow-hidden rounded-2xl ${sizeClass} ${castaway.status === 'eliminated' ? 'opacity-60' : ''}`}
            >
              <img
                src={getAvatarUrl(castaway.name, castaway.photo_url)}
                alt={castaway.name}
                className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
                  castaway.status === 'eliminated' ? 'grayscale' : ''
                }`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (castaway.photo_url && !target.src.includes('dicebear')) {
                    target.src = getAvatarUrl(castaway.name, null);
                  }
                }}
              />
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity`}
              />

              {/* Tribe accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: tribe.primary }}
              />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-bold text-white text-sm truncate group-hover:text-amber-300 transition-colors">
                  {castaway.name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{tribe.name}</span>
                  <span className="text-amber-500 font-bold text-sm">{stats?.total ?? 0}</span>
                </div>
              </div>

              {/* Status icons */}
              {castaway.status === 'winner' && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white p-1.5 rounded-full">
                  <Trophy className="h-4 w-4" />
                </div>
              )}
              {castaway.status === 'eliminated' && (
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full">
                  EP {castaway.episodes?.number || '?'}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  // View mode buttons config
  const viewModes: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'polaroid', label: 'Polaroid', icon: <Grid3X3 className="h-4 w-4" /> },
    { key: 'magazine', label: 'Magazine', icon: <LayoutList className="h-4 w-4" /> },
    { key: 'tribal', label: 'Tribal', icon: <Flame className="h-4 w-4" /> },
    { key: 'leaderboard', label: 'Rankings', icon: <Zap className="h-4 w-4" /> },
    { key: 'mosaic', label: 'Mosaic', icon: <Sparkles className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <Flame className="h-8 w-8 text-amber-500" />
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 tracking-tight">
              {season?.name || `Season ${season?.number || ''}`}
            </h1>
          </div>
          <p className="text-stone-400 text-lg">
            {castaways?.length || 0} castaways competing for the title of Sole Survivor
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <div className="bg-stone-800/50 backdrop-blur border border-stone-700/50 rounded-2xl px-6 py-4 text-center">
            <p className="text-3xl font-black text-white">{castaways?.length || 0}</p>
            <p className="text-xs text-stone-500 uppercase tracking-wider">Total</p>
          </div>
          <div className="bg-stone-800/50 backdrop-blur border border-stone-700/50 rounded-2xl px-6 py-4 text-center">
            <p className="text-3xl font-black text-green-500">{activeCount}</p>
            <p className="text-xs text-stone-500 uppercase tracking-wider">Active</p>
          </div>
          <div className="bg-stone-800/50 backdrop-blur border border-stone-700/50 rounded-2xl px-6 py-4 text-center">
            <p className="text-3xl font-black text-stone-500">{eliminatedCount}</p>
            <p className="text-xs text-stone-500 uppercase tracking-wider">Eliminated</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search castaways..."
              className="w-full pl-12 pr-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="eliminated">Eliminated</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-3 bg-stone-800/50 border border-stone-700/50 rounded-xl text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="name">Sort by Name</option>
              <option value="points">Sort by Points</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex flex-wrap gap-2 mb-8">
          {viewModes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === mode.key
                  ? 'bg-amber-500 text-stone-900 shadow-lg shadow-amber-500/25'
                  : 'bg-stone-800/50 text-stone-400 hover:bg-stone-700/50 hover:text-stone-200 border border-stone-700/50'
              }`}
            >
              {mode.icon}
              {mode.label}
            </button>
          ))}
        </div>

        {/* Content based on view mode */}
        <div className="pb-12">
          {filteredCastaways.length === 0 ? (
            <div className="bg-stone-800/30 rounded-2xl p-12 border border-stone-700/50 text-center">
              <Users className="h-12 w-12 text-stone-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-stone-300 mb-2">No castaways found</h3>
              <p className="text-stone-500">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <>
              {viewMode === 'polaroid' && <PolaroidView />}
              {viewMode === 'magazine' && <MagazineView />}
              {viewMode === 'tribal' && <TribalView />}
              {viewMode === 'leaderboard' && <LeaderboardView />}
              {viewMode === 'mosaic' && <MosaicView />}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
