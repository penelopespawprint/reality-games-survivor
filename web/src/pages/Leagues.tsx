import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Users,
  Search,
  Lock,
  Globe,
  Heart,
  Plus,
  Loader2,
  Crown,
  Check,
  ArrowRight,
  UserPlus,
} from 'lucide-react';

interface _League {
  id: string;
  name: string;
  code: string;
  is_public: boolean;
  is_global: boolean;
  require_donation: boolean;
  donation_amount: number | null;
  max_players: number;
  status: string;
  commissioner_id: string;
  commissioner?: {
    display_name: string;
  };
  member_count?: number;
}

export default function Leagues() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [_showJoinModal, _setShowJoinModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'public' | 'mine'>('all');

  // Fetch all leagues
  const { data: leagues, isLoading } = useQuery({
    queryKey: ['all-leagues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select(
          `
          *,
          commissioner:users!leagues_commissioner_id_fkey (display_name)
        `
        )
        .eq('is_global', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch member counts for each league
  const { data: memberCounts } = useQuery({
    queryKey: ['league-member-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('league_members').select('league_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((m: any) => {
        counts[m.league_id] = (counts[m.league_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch user's league memberships
  const { data: myMemberships } = useQuery({
    queryKey: ['my-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('league_members')
        .select('league_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data?.map((m: any) => m.league_id) || [];
    },
    enabled: !!user?.id,
  });

  // Filter and search leagues
  const filteredLeagues = leagues?.filter((league) => {
    // Search filter
    const matchesSearch =
      league.name.toLowerCase().includes(search.toLowerCase()) ||
      league.commissioner?.display_name?.toLowerCase().includes(search.toLowerCase());

    // Type filter
    if (filter === 'public' && !league.is_public) return false;
    if (filter === 'mine' && !myMemberships?.includes(league.id)) return false;

    return matchesSearch;
  });

  const handleJoinWithCode = () => {
    if (joinCode.trim()) {
      navigate(`/join/${joinCode.trim().toUpperCase()}`);
    }
  };

  const isAlreadyMember = (leagueId: string) => myMemberships?.includes(leagueId);

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-800 flex items-center gap-3">
            <Users className="h-8 w-8 text-burgundy-500" />
            Leagues
          </h1>
          <p className="text-neutral-500 mt-1">Find and join leagues to compete with others</p>
        </div>
        <Link to="/leagues/create" className="btn btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create League
        </Link>
      </div>

      {/* Join with Code Section */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1">
            <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
              <Lock className="h-5 w-5 text-burgundy-500" />
              Have an invite code?
            </h2>
            <p className="text-neutral-500 text-sm mt-1">
              Enter your 6-character code to join a private league
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="input font-mono text-center tracking-widest uppercase w-32"
            />
            <button
              onClick={handleJoinWithCode}
              disabled={joinCode.length !== 6}
              className="btn btn-primary disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leagues by name or creator..."
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-burgundy-500 text-white'
                : 'bg-white text-neutral-600 border border-cream-200 hover:border-burgundy-200'
            }`}
          >
            All Leagues
          </button>
          <button
            onClick={() => setFilter('public')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              filter === 'public'
                ? 'bg-burgundy-500 text-white'
                : 'bg-white text-neutral-600 border border-cream-200 hover:border-burgundy-200'
            }`}
          >
            <Globe className="h-4 w-4" />
            Public
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'mine'
                ? 'bg-burgundy-500 text-white'
                : 'bg-white text-neutral-600 border border-cream-200 hover:border-burgundy-200'
            }`}
          >
            My Leagues
          </button>
        </div>
      </div>

      {/* Leagues Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      ) : filteredLeagues?.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-12 border border-cream-200 text-center">
          <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">No leagues found</h3>
          <p className="text-neutral-500 mb-6">
            {filter === 'mine'
              ? "You haven't joined any leagues yet"
              : search
                ? 'Try a different search term'
                : 'Be the first to create a league!'}
          </p>
          <Link to="/leagues/create" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create a League
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeagues?.map((league) => {
            const memberCount = memberCounts?.[league.id] || 0;
            const isMember = isAlreadyMember(league.id);
            const isFull = memberCount >= league.max_players;
            const isCommissioner = league.commissioner_id === user?.id;

            return (
              <div
                key={league.id}
                className={`bg-white rounded-2xl shadow-card border overflow-hidden transition-all hover:shadow-card-hover ${
                  isMember ? 'border-burgundy-200 ring-2 ring-burgundy-100' : 'border-cream-200'
                }`}
              >
                {/* Header */}
                <div className="p-5 border-b border-cream-100">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-neutral-800 text-lg leading-tight">
                      {league.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      {league.is_public ? (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          <Globe className="h-3 w-3" />
                          Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                          <Lock className="h-3 w-3" />
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <Crown className="h-4 w-4 text-burgundy-400" />
                    <span>{league.commissioner?.display_name || 'Unknown'}</span>
                    {isCommissioner && (
                      <span className="text-xs bg-burgundy-100 text-burgundy-600 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-neutral-400 text-xs uppercase tracking-wide">Players</p>
                      <p className="text-lg font-semibold text-neutral-800">
                        {memberCount}/{league.max_players}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-400 text-xs uppercase tracking-wide">Status</p>
                      <p
                        className={`text-lg font-semibold capitalize ${
                          league.status === 'active'
                            ? 'text-green-600'
                            : league.status === 'drafting'
                              ? 'text-orange-600'
                              : 'text-neutral-600'
                        }`}
                      >
                        {league.status}
                      </p>
                    </div>
                  </div>

                  {/* Donation Badge */}
                  {league.require_donation && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-gradient-to-r from-burgundy-50 to-cream-50 rounded-xl border border-burgundy-100">
                      <Heart className="h-5 w-5 text-burgundy-500" />
                      <div>
                        <p className="text-burgundy-700 font-medium text-sm">
                          ${league.donation_amount} Entry
                        </p>
                        <p className="text-burgundy-500 text-xs">All proceeds to charity</p>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {isMember ? (
                    <Link
                      to={`/leagues/${league.id}`}
                      className="w-full btn btn-primary flex items-center justify-center gap-2"
                    >
                      <Check className="h-5 w-5" />
                      View League
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : league.is_public ? (
                    <Link
                      to={`/join/${league.code}`}
                      className={`w-full btn flex items-center justify-center gap-2 ${
                        isFull ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'
                      }`}
                    >
                      <UserPlus className="h-5 w-5" />
                      {isFull ? 'League Full' : 'Join League'}
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full btn btn-secondary opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Lock className="h-5 w-5" />
                      Invite Only
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Footer */}
      {leagues && leagues.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl shadow-card p-6 border border-cream-200">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-display font-bold text-neutral-800">{leagues.length}</p>
              <p className="text-neutral-500 text-sm">Total Leagues</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-green-600">
                {leagues.filter((l) => l.is_public).length}
              </p>
              <p className="text-neutral-500 text-sm">Public Leagues</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-burgundy-600">
                {myMemberships?.length || 0}
              </p>
              <p className="text-neutral-500 text-sm">Your Leagues</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
