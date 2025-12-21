import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Trophy, Skull, Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export default function SeasonCastaways() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'eliminated'>('all');

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

  const filteredCastaways = castaways?.filter((c: any) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tribe_original?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && c.status === 'active') ||
      (filter === 'eliminated' && c.status === 'eliminated');
    return matchesSearch && matchesFilter;
  });

  const activeCount = castaways?.filter((c: any) => c.status === 'active').length || 0;
  const eliminatedCount = castaways?.filter((c: any) => c.status === 'eliminated').length || 0;

  if (seasonLoading || castawaysLoading) {
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
          to="/dashboard"
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-gold-500" />
            Castaways
          </h1>
          <p className="text-burgundy-200">Season {season?.number}: {season?.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-center">
          <p className="text-2xl font-bold text-white">{castaways?.length || 0}</p>
          <p className="text-burgundy-300 text-xs">Total</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-burgundy-300 text-xs">Active</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{eliminatedCount}</p>
          <p className="text-burgundy-300 text-xs">Eliminated</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-burgundy-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search castaways..."
            className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="eliminated">Eliminated</option>
        </select>
      </div>

      {/* Castaways Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredCastaways?.map((castaway: any) => (
          <div
            key={castaway.id}
            className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border ${
              castaway.status === 'eliminated'
                ? 'border-red-500/30 opacity-75'
                : castaway.status === 'winner'
                ? 'border-gold-500/50'
                : 'border-white/10'
            }`}
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
                <div className="w-14 h-14 bg-burgundy-700 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-burgundy-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {castaway.status === 'winner' && (
                    <Trophy className="h-4 w-4 text-gold-500" />
                  )}
                  {castaway.status === 'eliminated' && (
                    <Skull className="h-4 w-4 text-red-400" />
                  )}
                  <h3 className="text-white font-medium truncate">{castaway.name}</h3>
                </div>
                <p className="text-burgundy-300 text-sm">{castaway.tribe_original}</p>
                {castaway.age && castaway.hometown && (
                  <p className="text-burgundy-400 text-xs truncate">
                    {castaway.age}, {castaway.hometown}
                  </p>
                )}
              </div>
            </div>

            {castaway.status === 'eliminated' && castaway.episodes && (
              <div className="mt-2 pt-2 border-t border-burgundy-700">
                <p className="text-red-400 text-xs">
                  Eliminated: Episode {castaway.episodes.number}
                  {castaway.placement && ` • ${castaway.placement}${getOrdinal(castaway.placement)} place`}
                </p>
              </div>
            )}

            {castaway.status === 'winner' && (
              <div className="mt-2 pt-2 border-t border-gold-500/30">
                <p className="text-gold-500 text-xs font-medium">
                  Sole Survivor
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCastaways?.length === 0 && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
          <Users className="h-12 w-12 text-burgundy-400 mx-auto mb-4" />
          <p className="text-burgundy-200">No castaways found.</p>
        </div>
      )}
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
