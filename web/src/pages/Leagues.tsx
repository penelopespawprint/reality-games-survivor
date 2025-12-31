import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Users, Search, Lock, Globe, Plus, Loader2, Crown, ArrowRight } from 'lucide-react';

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

// Color presets for league cards
const LEAGUE_COLORS = [
  'from-burgundy-500 to-red-600',
  'from-blue-500 to-indigo-600',
  'from-green-500 to-emerald-600',
  'from-purple-500 to-violet-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-500',
  'from-teal-500 to-cyan-600',
];

// Get a consistent color based on league id
function getLeagueColor(leagueId: string): string {
  const hash = leagueId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return LEAGUE_COLORS[hash % LEAGUE_COLORS.length];
}

export default function Leagues() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [filter, setFilter] = useState<'all' | 'commissioner' | 'member'>('all');

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
      return (data || []) as _League[];
    },
  });

  // Fetch member counts for each league
  const { data: memberCounts } = useQuery({
    queryKey: ['league-member-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('league_members').select('league_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((m: { league_id: string }) => {
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
      return data?.map((m: { league_id: string }) => m.league_id) || [];
    },
    enabled: !!user?.id,
  });

  // Filter and search leagues
  const filteredLeagues = leagues?.filter((league) => {
    // Search filter
    const matchesSearch =
      league.name.toLowerCase().includes(search.toLowerCase()) ||
      league.commissioner?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      league.code.toLowerCase().includes(search.toLowerCase());

    // Type filter
    const isMember = myMemberships?.includes(league.id);
    const isCommissioner = league.commissioner_id === user?.id;

    // Hide private leagues unless user is a member or commissioner
    // Users need the invite code to join private leagues
    if (!league.is_public && !isMember && !isCommissioner) return false;

    if (filter === 'commissioner' && !isCommissioner) return false;
    if (filter === 'member' && !isMember) return false;

    return matchesSearch;
  });

  const handleJoinWithCode = () => {
    if (joinCode.trim()) {
      navigate(`/join/${joinCode.trim().toUpperCase()}`);
    }
  };

  const isAlreadyMember = (leagueId: string) => myMemberships?.includes(leagueId);

  // Count leagues by role
  const commissionerCount = leagues?.filter((l) => l.commissioner_id === user?.id).length || 0;
  const memberCount = myMemberships?.length || 0;

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-800 flex items-center gap-3">
            <span className="text-3xl">🏆</span> My Leagues
          </h1>
          <p className="text-neutral-500 mt-1">Manage your fantasy leagues and track standings</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const modal = document.getElementById('join-modal');
              if (modal) modal.classList.toggle('hidden');
            }}
            className="px-4 py-2 bg-white border border-cream-200 text-neutral-700 rounded-xl font-medium hover:bg-cream-50 transition shadow-sm"
          >
            Join League
          </button>
          <Link
            to="/leagues/create"
            className="px-4 py-2 bg-burgundy-500 text-white rounded-xl font-semibold hover:bg-burgundy-600 transition shadow-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create League
          </Link>
        </div>
      </div>

      {/* Join with Code Section - Collapsible Modal Style */}
      <div
        id="join-modal"
        className="hidden bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-6 animate-fade-in"
      >
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

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl p-4 mb-6 border border-cream-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leagues..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-cream-200 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === 'all'
                ? 'bg-burgundy-500 text-white'
                : 'bg-cream-100 text-neutral-600 hover:bg-cream-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('commissioner')}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filter === 'commissioner'
                ? 'bg-burgundy-500 text-white'
                : 'bg-cream-100 text-neutral-600 hover:bg-cream-200'
            }`}
          >
            <Crown className="h-4 w-4" />
            Commissioner {commissionerCount > 0 && `(${commissionerCount})`}
          </button>
          <button
            onClick={() => setFilter('member')}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              filter === 'member'
                ? 'bg-burgundy-500 text-white'
                : 'bg-cream-100 text-neutral-600 hover:bg-cream-200'
            }`}
          >
            <Users className="h-4 w-4" />
            Member {memberCount > 0 && `(${memberCount})`}
          </button>
        </div>
      </div>

      {/* Leagues Table - Variation B */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
          </div>
          <p className="text-neutral-500">Loading leagues...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl border border-cream-200 overflow-hidden">
          <div className="bg-cream-50 px-4 sm:px-6 py-4 border-b border-cream-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-neutral-600">
              <div className="col-span-4">League</div>
              <div className="col-span-2 text-center">Members</div>
              <div className="col-span-2 text-center">Role</div>
              <div className="col-span-2 text-center">Donation</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
          </div>

          <div className="divide-y divide-cream-100">
            {filteredLeagues?.map((league) => {
              const leagueMemberCount = memberCounts?.[league.id] || 0;
              const isMember = isAlreadyMember(league.id);
              const isFull = leagueMemberCount >= league.max_players;
              const isCommissioner = league.commissioner_id === user?.id;
              const colorGradient = getLeagueColor(league.id);

              return (
                <div
                  key={league.id}
                  className="px-4 sm:px-6 py-4 hover:bg-cream-50 transition cursor-pointer group"
                  onClick={() => navigate(`/leagues/${league.id}`)}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4 flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorGradient} flex items-center justify-center text-white font-bold`}
                      >
                        {league.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-800 group-hover:text-burgundy-600">
                          {league.name}
                        </h3>
                        <p className="text-xs text-neutral-400 font-mono">{league.code}</p>
                        <p className="text-xs text-neutral-500">
                          {league.commissioner?.display_name || 'Commissioner'}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="text-neutral-700">
                        {leagueMemberCount}/{league.max_players}
                      </span>
                    </div>

                    <div className="col-span-2 text-center">
                      {isCommissioner ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-full text-xs font-semibold">
                          <Crown className="h-3 w-3" />
                          Commissioner
                        </span>
                      ) : isMember ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 px-2 py-1 rounded-full text-xs font-semibold">
                          Member
                        </span>
                      ) : league.is_public ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-semibold">
                          <Globe className="h-3 w-3" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-neutral-700 bg-neutral-100 px-2 py-1 rounded-full text-xs font-semibold">
                          <Lock className="h-3 w-3" />
                          Private
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 text-center">
                      {league.require_donation && league.donation_amount ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-full text-xs font-semibold border border-amber-100">
                          ${league.donation_amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-sm">—</span>
                      )}
                    </div>

                    <div className="col-span-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-medium ${
                            league.status === 'active'
                              ? 'text-green-600'
                              : league.status === 'drafting'
                                ? 'text-amber-600'
                                : 'text-neutral-500'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              league.status === 'active'
                                ? 'bg-green-500'
                                : league.status === 'drafting'
                                  ? 'bg-amber-400'
                                  : 'bg-neutral-300'
                            }`}
                          />
                          {league.status || 'unknown'}
                        </span>
                        {!isMember && !isFull && (
                          <Link
                            to={`/join/${league.code}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-burgundy-600 font-semibold text-sm inline-flex items-center gap-1"
                          >
                            Join <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                        {isMember && (
                          <Link
                            to={`/leagues/${league.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-burgundy-600 font-semibold text-sm inline-flex items-center gap-1"
                          >
                            View <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                        {isFull && !isMember && (
                          <span className="text-xs text-red-500 font-semibold">Full</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredLeagues?.length === 0 && (
              <div className="px-6 py-10 text-center text-neutral-500">No leagues found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
