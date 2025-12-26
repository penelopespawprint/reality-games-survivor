import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Search, Loader2, Crown, DollarSign, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Navigation } from '@/components/Navigation';

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
      const { data, error } = await supabase.from('league_members').select('league_id');
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.league_id] = (counts[m.league_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filteredLeagues = leagues?.filter((league: any) => {
    const matchesSearch =
      league.name.toLowerCase().includes(search.toLowerCase()) ||
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
            to="/admin"
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <Users className="h-6 w-6 text-burgundy-500" />
              All Leagues
            </h1>
            <p className="text-neutral-500">{leagues?.length || 0} total leagues</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-2xl shadow-card p-3 border border-cream-200 text-center">
            <p className="text-xl font-bold text-neutral-800">{stats.total}</p>
            <p className="text-neutral-500 text-xs">Total</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-green-600">{stats.active}</p>
            <p className="text-neutral-500 text-xs">Active</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{stats.drafting}</p>
            <p className="text-neutral-500 text-xs">Drafting</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.paid}</p>
            <p className="text-neutral-500 text-xs">Paid</p>
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
              placeholder="Search leagues..."
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input px-3 py-2 w-36"
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
              className="bg-white rounded-2xl shadow-card p-4 border border-cream-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {league.is_global && <Globe className="h-4 w-4 text-burgundy-500" />}
                  <h3 className="text-neutral-800 font-medium">{league.name}</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    league.status === 'active'
                      ? 'bg-green-100 text-green-600'
                      : league.status === 'drafting'
                        ? 'bg-amber-100 text-amber-600'
                        : league.status === 'completed'
                          ? 'bg-neutral-100 text-neutral-600'
                          : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {league.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-neutral-500 mb-3">
                <div className="flex items-center gap-1">
                  <Crown className="h-4 w-4" />
                  <span>{league.users?.display_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>
                    {memberCounts?.[league.id] || 0}/{league.max_players} players
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">Code:</span>{' '}
                  <span className="font-mono text-burgundy-500">{league.code}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Season:</span>{' '}
                  <span>{league.seasons?.number}</span>
                </div>
              </div>

              {league.require_donation && (
                <div className="flex items-center gap-1 text-sm text-green-600 mb-3">
                  <DollarSign className="h-4 w-4" />
                  <span>${league.donation_amount} entry fee</span>
                </div>
              )}

              <div className="flex gap-2">
                <Link to={`/leagues/${league.id}`} className="btn btn-secondary flex-1 text-center">
                  View League
                </Link>
                <Link
                  to={`/leagues/${league.id}/settings`}
                  className="btn btn-primary flex-1 text-center"
                >
                  Settings
                </Link>
              </div>
            </div>
          ))}

          {filteredLeagues?.length === 0 && (
            <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 text-center">
              <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-500">No leagues found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
