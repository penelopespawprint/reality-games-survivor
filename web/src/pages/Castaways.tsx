import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Users, Loader2 } from 'lucide-react';
import { CastawayFilterBar, CastawayGridItem } from '@/components/castaways';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
// import type { Castaway } from '@/types';

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
  episodes?: { number: number } | null;
}

export default function Castaways() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'eliminated'>('all');
  const [expandedCastaway, setExpandedCastaway] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'status'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'strip' | 'spotlight'>('grid');

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

  // Tribe configuration
  const tribeConfig: Record<
    string,
    { name: string; color: string; bgColor: string; borderColor: string }
  > = {
    Vatu: {
      name: 'Vatu Tribe',
      color: '#7C3AED', // Purple
      bgColor: '#EDE9FE',
      borderColor: '#A78BFA',
    },
    Kalo: {
      name: 'Kalo Tribe',
      color: '#0D9488', // Teal
      bgColor: '#CCFBF1',
      borderColor: '#5EEAD4',
    },
    Cila: {
      name: 'Cila Tribe',
      color: '#EA580C', // Orange
      bgColor: '#FFEDD5',
      borderColor: '#FB923C',
    },
  };

  // Group castaways by tribe
  const castawaysByTribe = useMemo(() => {
    if (!castaways) return {};

    const grouped: Record<string, typeof castaways> = {};

    castaways.forEach((castaway) => {
      const tribe = castaway.tribe_original || 'Unknown';
      if (!grouped[tribe]) {
        grouped[tribe] = [];
      }
      grouped[tribe].push(castaway);
    });

    // Sort each tribe's castaways by name
    Object.keys(grouped).forEach((tribe) => {
      grouped[tribe].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [castaways]);

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

  // Aggregate scores by castaway (memoized)
  const castawayStats = useMemo(() => {
    return (
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
      ) || {}
    );
  }, [allScores]);

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

  // Check if any tribe has filtered results
  const hasFilteredResults = useMemo(() => {
    return Object.values(castawaysByTribe).some((tribeCastaways) => {
      return tribeCastaways.some((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.occupation?.toLowerCase().includes(search.toLowerCase()) ||
          c.hometown?.toLowerCase().includes(search.toLowerCase());
        const matchesFilter =
          filter === 'all' ||
          (filter === 'active' && c.status === 'active') ||
          (filter === 'eliminated' && c.status === 'eliminated');
        return matchesSearch && matchesFilter;
      });
    });
  }, [castawaysByTribe, search, filter]);

  const activeCount = castaways?.filter((c) => c.status === 'active').length || 0;
  const eliminatedCount = castaways?.filter((c) => c.status === 'eliminated').length || 0;

  // Flattened list for list/strip/spotlight modes
  const flattenedCastaways = useMemo(() => {
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

  if (seasonLoading || castawaysLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (seasonError || !season) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-700 mb-2">No Active Season</h2>
            <p className="text-neutral-500">Check back when a new season begins!</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="pb-12">
          {/* Header - Centered with Emoji */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="text-4xl">🔥</span>
              <h1 className="text-4xl font-display font-bold text-neutral-800">
                {season?.name || `Season ${season?.number || ''}`} Castaways
              </h1>
            </div>
            <p className="text-neutral-500 text-lg">
              {castaways?.length || 0} castaways competing for the title of Sole Survivor
            </p>
          </div>

          {/* Stats Row - Variation A Style */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-4 text-center shadow-lg border border-cream-200">
              <p className="text-3xl font-bold text-neutral-800">{castaways?.length || 0}</p>
              <p className="text-sm text-neutral-500">Total</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-lg border border-cream-200">
              <p className="text-3xl font-bold text-green-600">{activeCount}</p>
              <p className="text-sm text-neutral-500">Active</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-lg border border-cream-200">
              <p className="text-3xl font-bold text-neutral-400">{eliminatedCount}</p>
              <p className="text-sm text-neutral-500">Eliminated</p>
            </div>
          </div>

          {/* Search, Filter & Sort */}
          <CastawayFilterBar
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />

          {/* View mode toggle - Variations */}
          <div className="flex flex-wrap gap-2 mt-4 mb-6">
            {[
              { key: 'grid', label: 'Tribe Grid' },
              { key: 'list', label: 'Full Cards' },
              { key: 'strip', label: 'Stat Strips' },
              { key: 'spotlight', label: 'Spotlight' },
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key as typeof viewMode)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                  viewMode === mode.key
                    ? 'bg-burgundy-500 text-white shadow-card'
                    : 'bg-cream-100 text-neutral-600 hover:bg-cream-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {viewMode === 'grid' ? (
            <>
              {/* Castaways by Tribe - Variation A (existing grid) */}
              <div className="space-y-12">
                {Object.entries(castawaysByTribe)
                  .sort(([a], [b]) => {
                    // Sort tribes: Vatu, Kalo, Cila, then Unknown
                    const order: Record<string, number> = {
                      Vatu: 1,
                      Kalo: 2,
                      Cila: 3,
                      Unknown: 99,
                    };
                    return (order[a] || 99) - (order[b] || 99);
                  })
                  .map(([tribe, tribeCastaways]) => {
                    const config = tribeConfig[tribe] || {
                      name: tribe,
                      color: '#6B7280',
                      bgColor: '#F3F4F6',
                      borderColor: '#9CA3AF',
                    };

                    // Filter tribe castaways based on search/filter
                    const filteredTribeCastaways = tribeCastaways.filter((c) => {
                      const matchesSearch =
                        c.name.toLowerCase().includes(search.toLowerCase()) ||
                        c.occupation?.toLowerCase().includes(search.toLowerCase()) ||
                        c.hometown?.toLowerCase().includes(search.toLowerCase());
                      const matchesFilter =
                        filter === 'all' ||
                        (filter === 'active' && c.status === 'active') ||
                        (filter === 'eliminated' && c.status === 'eliminated');
                      return matchesSearch && matchesFilter;
                    });

                    // Sort tribe castaways
                    const sortedTribeCastaways = filteredTribeCastaways.sort((a, b) => {
                      if (sortBy === 'points') {
                        return (
                          (castawayStats[b.id]?.total || 0) - (castawayStats[a.id]?.total || 0)
                        );
                      }
                      if (sortBy === 'status') {
                        const statusOrder: Record<string, number> = {
                          winner: 0,
                          active: 1,
                          eliminated: 2,
                        };
                        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
                      }
                      return a.name.localeCompare(b.name);
                    });

                    if (sortedTribeCastaways.length === 0) return null;

                    return (
                      <div key={tribe} className="mb-16">
                        {/* Tribe Section Container */}
                        <div
                          className="bg-white rounded-2xl shadow-lg border-2 overflow-hidden"
                          style={{
                            borderColor: config.borderColor,
                          }}
                        >
                          {/* Tribe Header Section - Variation A Style */}
                          <div
                            className="px-6 py-5 border-b-2"
                            style={{
                              backgroundColor: config.bgColor,
                              borderColor: config.borderColor,
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="w-10 h-10 rounded-full shadow-md flex items-center justify-center"
                                style={{ backgroundColor: config.color }}
                              >
                                <span className="text-white text-xl">
                                  {tribe === 'Vatu'
                                    ? '🟣'
                                    : tribe === 'Kalo'
                                      ? '🟢'
                                      : tribe === 'Cila'
                                        ? '🟠'
                                        : '⚪'}
                                </span>
                              </div>
                              <div>
                                <h3
                                  className="text-2xl font-display font-bold"
                                  style={{ color: config.color }}
                                >
                                  {config.name}
                                </h3>
                                <p className="text-neutral-600 text-sm">
                                  {sortedTribeCastaways.length} castaways •{' '}
                                  {sortedTribeCastaways.filter((c) => c.status === 'active').length}{' '}
                                  active •{' '}
                                  {
                                    sortedTribeCastaways.filter((c) => c.status === 'eliminated')
                                      .length
                                  }{' '}
                                  eliminated
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Castaways Grid Section - 6 columns on XL like Variation A */}
                          <div className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                              {sortedTribeCastaways.map((castaway) => (
                                <CastawayGridItem
                                  key={castaway.id}
                                  castaway={castaway}
                                  stats={castawayStats[castaway.id]}
                                  isExpanded={expandedCastaway === castaway.id}
                                  onToggleExpand={setExpandedCastaway}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {flattenedCastaways.map((castaway) => (
                <div
                  key={castaway.id}
                  className="bg-white rounded-2xl shadow-lg border border-cream-200 overflow-hidden hover:shadow-xl transition cursor-pointer"
                  onClick={() =>
                    setExpandedCastaway(expandedCastaway === castaway.id ? null : castaway.id)
                  }
                >
                  <div className="flex items-stretch">
                    <div className="w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0 relative overflow-hidden">
                      <img
                        src={
                          castaway.photo_url ||
                          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop'
                        }
                        alt={castaway.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                        {castaway.status.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 p-5 flex flex-col justify-center">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-2xl font-display font-bold text-neutral-800">
                            {castaway.name}
                          </h3>
                          <p className="text-neutral-500">
                            {castaway.occupation || 'Castaway'}
                            {castaway.hometown ? ` • ${castaway.hometown}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-display font-bold text-burgundy-500">
                            {castawayStats[castaway.id]?.total ?? 0}
                          </p>
                          <p className="text-xs text-neutral-400">total points</p>
                        </div>
                      </div>
                      <p className="text-neutral-600 mt-3 text-sm line-clamp-2">
                        {castaway.bio || 'Click to view more details and performance.'}
                      </p>
                      <div className="flex items-center gap-4 mt-4 text-sm text-neutral-600">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          {castaway.status === 'active'
                            ? 'Still in the game'
                            : castaway.status === 'winner'
                              ? 'Winner'
                              : 'Eliminated'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          🏝️ {castaway.tribe_original || 'Unknown tribe'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          📺 {castawayStats[castaway.id]?.episodeCount || 0} eps
                        </span>
                      </div>
                    </div>
                  </div>

                  {expandedCastaway === castaway.id && (
                    <div className="border-t border-cream-200 bg-cream-50 p-5">
                      <div className="flex flex-wrap gap-4 text-sm text-neutral-700">
                        <div className="bg-white rounded-xl border border-cream-200 px-4 py-3 shadow-sm">
                          <div className="text-xs text-neutral-500">Latest Trend</div>
                          <div className="font-semibold">
                            {castawayStats[castaway.id]?.trend === 'up'
                              ? 'Rising 📈'
                              : castawayStats[castaway.id]?.trend === 'down'
                                ? 'Cooling 📉'
                                : 'Steady ➖'}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-cream-200 px-4 py-3 shadow-sm">
                          <div className="text-xs text-neutral-500">Episodes Played</div>
                          <div className="font-semibold">
                            {castawayStats[castaway.id]?.episodeCount || 0}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-cream-200 px-4 py-3 shadow-sm">
                          <div className="text-xs text-neutral-500">Best Episode</div>
                          <div className="font-semibold">
                            {(() => {
                              const epEntries = Object.entries(
                                castawayStats[castaway.id]?.byEpisode || {}
                              );
                              if (!epEntries.length) return '--';
                              const best = epEntries.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
                              return `Ep ${best[0]} (${best[1]} pts)`;
                            })()}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-cream-200 px-4 py-3 shadow-sm flex-1 min-w-[200px]">
                          <div className="text-xs text-neutral-500 mb-1">Bio</div>
                          <p className="text-neutral-700 text-sm">
                            {castaway.bio || 'No bio available.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {flattenedCastaways.length === 0 && (
                <div className="bg-white rounded-2xl shadow-card p-10 text-center text-neutral-500">
                  No castaways match your filters.
                </div>
              )}
            </div>
          ) : viewMode === 'strip' ? (
            <div className="space-y-3">
              {flattenedCastaways.map((castaway) => (
                <div
                  key={castaway.id}
                  className="bg-white border border-cream-200 rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() =>
                    setExpandedCastaway(expandedCastaway === castaway.id ? null : castaway.id)
                  }
                >
                  <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center font-semibold text-neutral-700">
                    {castaway.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-neutral-800">{castaway.name}</p>
                      <span className="text-xs bg-cream-100 text-neutral-500 px-2 py-0.5 rounded-full">
                        {castaway.tribe_original || 'Unknown'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {castaway.occupation || 'Castaway'} • {castaway.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-display font-bold text-burgundy-500">
                      {castawayStats[castaway.id]?.total ?? 0}
                    </p>
                    <p className="text-xs text-neutral-400">pts</p>
                  </div>
                </div>
              ))}
              {flattenedCastaways.length === 0 && (
                <div className="bg-white rounded-xl border border-cream-200 p-6 text-center text-neutral-500">
                  No castaways match your filters.
                </div>
              )}
            </div>
          ) : (
            /* Spotlight mode */
            <div className="grid md:grid-cols-2 gap-4">
              {flattenedCastaways.slice(0, 6).map((castaway) => (
                <div
                  key={castaway.id}
                  className="relative overflow-hidden rounded-2xl shadow-xl border border-cream-200 bg-gradient-to-br from-burgundy-600 via-burgundy-500 to-amber-500 text-white hover:shadow-2xl transition cursor-pointer"
                  onClick={() =>
                    setExpandedCastaway(expandedCastaway === castaway.id ? null : castaway.id)
                  }
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="flex flex-col h-full relative">
                    <div className="p-5 flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-amber-100 mb-1">
                          Spotlight
                        </p>
                        <h3 className="text-2xl font-display font-bold">{castaway.name}</h3>
                        <p className="text-sm text-amber-100">
                          {castaway.occupation || 'Castaway'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-display font-bold">
                          {castawayStats[castaway.id]?.total ?? 0}
                        </p>
                        <p className="text-xs text-amber-100">total points</p>
                      </div>
                    </div>
                    <div className="px-5 pb-5 text-sm text-amber-50 line-clamp-3">
                      {castaway.bio || 'Their story is unfolding—click for full details.'}
                    </div>
                  </div>
                </div>
              ))}
              {flattenedCastaways.length === 0 && (
                <div className="bg-white rounded-xl border border-cream-200 p-6 text-center text-neutral-500 col-span-full">
                  No castaways match your filters.
                </div>
              )}
            </div>
          )}

          {!hasFilteredResults && (
            <div className="bg-white rounded-2xl shadow-card p-12 border border-cream-200 text-center">
              <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-800 mb-2">No castaways found</h3>
              <p className="text-neutral-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
