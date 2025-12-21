import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Search, Filter, Loader2, Crown, DollarSign, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function AdminLeagues() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch all leagues
  const { data: leagues, isLoading } = useQuery({
    queryKey: ['admin-leagues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(number, name), users:commissioner_id(display_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch member counts
  const { data: memberCounts } = useQuery({
    queryKey: ['admin-league-member-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_members')
        .select('league_id');
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.league_id] = (counts[m.league_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filteredLeagues = leagues?.filter((league: any) => {
    const matchesSearch = league.name.toLowerCase().includes(search.toLowerCase()) ||
      league.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || league.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leagues?.length || 0,
    active: leagues?.filter((l: any) => l.status === 'active').length || 0,
    drafting: leagues?.filter((l: any) => l.status === 'drafting').length || 0,
    forming: leagues?.filter((l: any) => l.status === 'forming').length || 0,
    paid: leagues?.filter((l: any) => l.require_donation).length || 0,
  };

  if (isLoading) {
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
          to="/admin"
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-gold-500" />
            All Leagues
          </h1>
          <p className="text-burgundy-200">{leagues?.length || 0} total leagues</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
          <p className="text-xl font-bold text-white">{stats.total}</p>
          <p className="text-burgundy-300 text-xs">Total</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-400">{stats.active}</p>
          <p className="text-burgundy-300 text-xs">Active</p>
        </div>
        <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-gold-400">{stats.drafting}</p>
          <p className="text-burgundy-300 text-xs">Drafting</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-400">{stats.paid}</p>
          <p className="text-burgundy-300 text-xs">Paid</p>
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
            placeholder="Search leagues..."
            className="w-full bg-burgundy-800 border border-burgundy-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-burgundy-400 focus:outline-none focus:border-gold-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-burgundy-800 border border-burgundy-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500"
        >
          <option value="all">All Status</option>
          <option value="forming">Forming</option>
          <option value="drafting">Drafting</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Leagues List */}
      <div className="space-y-3">
        {filteredLeagues?.map((league: any) => (
          <div
            key={league.id}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {league.is_global && (
                  <Globe className="h-4 w-4 text-gold-500" />
                )}
                <h3 className="text-white font-medium">{league.name}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                league.status === 'active' ? 'bg-green-500/20 text-green-400' :
                league.status === 'drafting' ? 'bg-gold-500/20 text-gold-400' :
                league.status === 'completed' ? 'bg-burgundy-500/20 text-burgundy-300' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {league.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-burgundy-300 mb-3">
              <div className="flex items-center gap-1">
                <Crown className="h-4 w-4" />
                <span>{league.users?.display_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{memberCounts?.[league.id] || 0}/{league.max_players} players</span>
              </div>
              <div>
                <span className="text-burgundy-400">Code:</span>{' '}
                <span className="font-mono text-gold-500">{league.code}</span>
              </div>
              <div>
                <span className="text-burgundy-400">Season:</span>{' '}
                <span>{league.seasons?.number}</span>
              </div>
            </div>

            {league.require_donation && (
              <div className="flex items-center gap-1 text-sm text-green-400 mb-3">
                <DollarSign className="h-4 w-4" />
                <span>${league.donation_amount} entry fee</span>
              </div>
            )}

            <div className="flex gap-2">
              <Link
                to={`/leagues/${league.id}`}
                className="flex-1 bg-burgundy-700 hover:bg-burgundy-600 text-white py-2 rounded-lg text-sm font-medium text-center transition-colors"
              >
                View League
              </Link>
              <Link
                to={`/leagues/${league.id}/settings`}
                className="flex-1 bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 py-2 rounded-lg text-sm font-medium text-center transition-colors"
              >
                Settings
              </Link>
            </div>
          </div>
        ))}

        {filteredLeagues?.length === 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
            <Users className="h-12 w-12 text-burgundy-400 mx-auto mb-4" />
            <p className="text-burgundy-200">No leagues found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
