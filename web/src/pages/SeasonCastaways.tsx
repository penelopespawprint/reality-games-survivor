import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Trophy,
  Skull,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';

interface _EpisodeScore {
  episode_id: string;
  castaway_id: string;
  points: number;
  episode: {
    number: number;
    title: string | null;
  };
}

export default function SeasonCastaways() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'eliminated'>('all');
  const [expandedCastaway, setExpandedCastaway] = useState<string | null>(null);

  // Fetch season details
  const { data: season, isLoading: seasonLoading } = useQuery({
    queryKey: ['season', seasonId],
    queryFn: async () => {
      if (!seasonId) throw new Error('No season ID');
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('id', seasonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!seasonId,
  });

  // Fetch castaways for this season
  const { data: castaways, isLoading: castawaysLoading } = useQuery({
    queryKey: ['season-castaways', seasonId],
    queryFn: async () => {
      if (!seasonId) throw new Error('No season ID');
      const { data, error } = await supabase
        .from('castaways')
        .select('*, episodes:eliminated_episode_id(number)')
        .eq('season_id', seasonId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!seasonId,
  });

  // Fetch episode scores for all castaways
  const { data: allScores } = useQuery({
    queryKey: ['castaway-scores', seasonId],
    queryFn: async () => {
      if (!seasonId) return [];
      // Get all episodes for this season first
      const { data: episodes } = await supabase
        .from('episodes')
        .select('id')
        .eq('season_id', seasonId);

      if (!episodes?.length) return [];

      const episodeIds = episodes.map((e) => e.id);

      // Get scores grouped by castaway and episode
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
      return data || [];
    },
    enabled: !!seasonId,
  });

  // Aggregate scores by castaway
  const castawayTotals =
    allScores?.reduce(
      (acc: Record<string, { total: number; byEpisode: Record<string, number> }>, score: any) => {
        if (!acc[score.castaway_id]) {
          acc[score.castaway_id] = { total: 0, byEpisode: {} };
        }
        acc[score.castaway_id].total += score.points;

        const epNum = score.episode?.number;
        if (epNum) {
          if (!acc[score.castaway_id].byEpisode[epNum]) {
            acc[score.castaway_id].byEpisode[epNum] = 0;
          }
          acc[score.castaway_id].byEpisode[epNum] += score.points;
        }
        return acc;
      },
      {} as Record<string, { total: number; byEpisode: Record<string, number> }>
    ) || {};

  const filteredCastaways = castaways?.filter((c: any) => {
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

  const activeCount = castaways?.filter((c: any) => c.status === 'active').length || 0;
  const eliminatedCount = castaways?.filter((c: any) => c.status === 'eliminated').length || 0;

  if (seasonLoading || castawaysLoading) {
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
            to="/dashboard"
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <Users className="h-6 w-6 text-burgundy-500" />
              Castaways
            </h1>
            <p className="text-neutral-500">
              Season {season?.number}: {season?.name}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-3 border border-cream-200 text-center">
            <p className="text-2xl font-bold text-neutral-800">{castaways?.length || 0}</p>
            <p className="text-neutral-500 text-xs">Total</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-neutral-500 text-xs">Active</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{eliminatedCount}</p>
            <p className="text-neutral-500 text-xs">Eliminated</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search castaways..."
              className="input pl-10"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="input px-3 py-2 w-32"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="eliminated">Eliminated</option>
          </select>
        </div>

        {/* Castaways Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredCastaways?.map((castaway: any) => {
            const scores = castawayTotals[castaway.id];
            const isExpanded = expandedCastaway === castaway.id;

            return (
              <div
                key={castaway.id}
                className={`bg-white rounded-2xl shadow-card border overflow-hidden ${
                  castaway.status === 'eliminated'
                    ? 'border-red-200 opacity-75'
                    : castaway.status === 'winner'
                      ? 'border-amber-400'
                      : 'border-cream-200'
                }`}
              >
                <button
                  onClick={() => setExpandedCastaway(isExpanded ? null : castaway.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    {castaway.photo_url ? (
                      <img
                        src={castaway.photo_url}
                        alt={castaway.name}
                        className={`w-14 h-14 rounded-full object-cover ${
                          castaway.status === 'eliminated' ? 'grayscale' : ''
                        }`}
                      />
                    ) : (
                      <div className="w-14 h-14 bg-cream-100 rounded-full flex items-center justify-center border border-cream-200">
                        <Users className="h-6 w-6 text-neutral-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {castaway.status === 'winner' && (
                          <Trophy className="h-4 w-4 text-amber-500" />
                        )}
                        {castaway.status === 'eliminated' && (
                          <Skull className="h-4 w-4 text-red-500" />
                        )}
                        <h3 className="text-neutral-800 font-medium truncate">{castaway.name}</h3>
                      </div>
                      {castaway.occupation && (
                        <p className="text-neutral-500 text-sm">{castaway.occupation}</p>
                      )}
                      {castaway.age && castaway.hometown && (
                        <p className="text-neutral-400 text-xs truncate">
                          {castaway.age}, {castaway.hometown}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {scores?.total !== undefined && (
                        <span
                          className={`text-lg font-bold ${scores.total >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {scores.total >= 0 ? '+' : ''}
                          {scores.total}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-neutral-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-neutral-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-cream-100">
                    {/* Status */}
                    {castaway.status === 'eliminated' && castaway.episodes && (
                      <div className="py-2 border-b border-cream-100">
                        <p className="text-red-600 text-sm">
                          Eliminated: Episode {castaway.episodes.number}
                          {castaway.placement &&
                            ` • ${castaway.placement}${getOrdinal(castaway.placement)} place`}
                        </p>
                      </div>
                    )}

                    {castaway.status === 'winner' && (
                      <div className="py-2 border-b border-amber-100">
                        <p className="text-amber-600 text-sm font-medium">Sole Survivor</p>
                      </div>
                    )}

                    {/* Episode Scores */}
                    <div className="pt-3">
                      <h4 className="text-sm font-semibold text-neutral-700 mb-2">
                        Episode Scores
                      </h4>
                      {scores?.byEpisode && Object.keys(scores.byEpisode).length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(scores.byEpisode)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([epNum, pts]) => (
                              <div key={epNum} className="text-center p-2 bg-cream-50 rounded-lg">
                                <p className="text-xs text-neutral-500">Ep {epNum}</p>
                                <p
                                  className={`font-bold ${Number(pts) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {Number(pts) >= 0 ? '+' : ''}
                                  {pts}
                                </p>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-neutral-400 text-sm">No scores yet</p>
                      )}
                    </div>

                    {/* Total */}
                    {scores?.total !== undefined && (
                      <div className="mt-3 pt-3 border-t border-cream-100 flex justify-between items-center">
                        <span className="text-sm font-medium text-neutral-600">Total Points</span>
                        <span
                          className={`text-xl font-bold ${scores.total >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {scores.total >= 0 ? '+' : ''}
                          {scores.total}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredCastaways?.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 text-center">
            <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">No castaways found.</p>
          </div>
        )}
      </div>
    </>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
