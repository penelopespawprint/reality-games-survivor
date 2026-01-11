import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';
import {
  Users,
  Search,
  Lock,
  Globe,
  Plus,
  Loader2,
  Crown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Target,
  Check,
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
  const { getCopy } = useSiteCopy();
  const [search, setSearch] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [myLeaguesExpanded, setMyLeaguesExpanded] = useState(true);

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

  // Fetch active season and current episode
  const { data: activeSeason } = useQuery({
    queryKey: ['active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch current episode
  const { data: currentEpisode } = useQuery({
    queryKey: ['current-episode', activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason?.id) return null;
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', activeSeason.id)
        .eq('is_current', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!activeSeason?.id,
  });

  // Fetch user's weekly picks for all leagues
  const { data: weeklyPicks } = useQuery({
    queryKey: ['weekly-picks', user?.id, currentEpisode?.id],
    queryFn: async () => {
      if (!user?.id || !currentEpisode?.id) return {};
      const { data, error } = await supabase
        .from('weekly_picks')
        .select('league_id, castaway_id, castaways(name, photo_url)')
        .eq('user_id', user.id)
        .eq('episode_id', currentEpisode.id);

      if (error) throw error;
      
      const picks: Record<string, { castaway_id: string; name: string; photo_url: string | null }> = {};
      data?.forEach((pick: any) => {
        picks[pick.league_id] = {
          castaway_id: pick.castaway_id,
          name: pick.castaways?.name || 'Unknown',
          photo_url: pick.castaways?.photo_url,
        };
      });
      return picks;
    },
    enabled: !!user?.id && !!currentEpisode?.id,
  });

  // Separate my leagues from other leagues
  const myLeagues = leagues?.filter((league) => myMemberships?.includes(league.id)) || [];

  // Filter joinable leagues (public or ones user can see)
  const joinableLeagues = leagues?.filter((league) => {
    const isMember = myMemberships?.includes(league.id);
    const isCommissioner = league.commissioner_id === user?.id;

    // Don't show leagues user is already in
    if (isMember) return false;

    // Show public leagues
    if (league.is_public) return true;

    // Show private leagues only if user is commissioner (shouldn't happen but just in case)
    if (isCommissioner) return true;

    return false;
  });

  // Apply search filter
  const filteredJoinableLeagues = joinableLeagues?.filter((league) => {
    const matchesSearch =
      league.name.toLowerCase().includes(search.toLowerCase()) ||
      league.commissioner?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      league.code.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleJoinWithCode = () => {
    if (joinCode.trim()) {
      navigate(`/join/${joinCode.trim().toUpperCase()}`);
    }
  };

  const _isAlreadyMember = (leagueId: string) => myMemberships?.includes(leagueId);

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-800 flex items-center gap-3">
            <span className="text-3xl">🏆</span> {getCopy('leagues.header.title', 'Leagues')}
          </h1>
          <p className="text-neutral-500 mt-1">
            {getCopy('leagues.header.subtitle', 'Manage your leagues and join new ones')}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/leagues/create"
            className="px-4 py-2 bg-burgundy-500 text-white rounded-xl font-semibold hover:bg-burgundy-600 transition shadow-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create League
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
          </div>
          <p className="text-neutral-500">Loading leagues...</p>
        </div>
      ) : (
        <>
          {/* My Leagues Section - Collapsible */}
          <div className="bg-white rounded-2xl shadow-xl border border-cream-200 overflow-hidden mb-8">
            <button
              onClick={() => setMyLeaguesExpanded(!myLeaguesExpanded)}
              className="w-full bg-gradient-to-r from-burgundy-500 to-burgundy-600 px-4 sm:px-6 py-4 flex items-center justify-between text-white"
            >
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5" />
                <span className="font-semibold text-lg">My Leagues</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                  {myLeagues.length}
                </span>
              </div>
              {myLeaguesExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>

            {myLeaguesExpanded && (
              <>
                {myLeagues.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <Users className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500 mb-4">You haven't joined any leagues yet</p>
                    <p className="text-sm text-neutral-400">
                      Join a public league below or use an invite code
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-cream-50 px-4 sm:px-6 py-3 border-b border-cream-200">
                      <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-neutral-600">
                        <div className="col-span-3">League</div>
                        <div className="col-span-2 text-center">Members</div>
                        <div className="col-span-3 text-center">Weekly Pick</div>
                        <div className="col-span-2 text-center">Role</div>
                        <div className="col-span-2 text-right">Actions</div>
                      </div>
                    </div>
                    <div className="divide-y divide-cream-100">
                      {myLeagues.map((league) => {
                        const leagueMemberCount = memberCounts?.[league.id] || 0;
                        const isCommissioner = league.commissioner_id === user?.id;
                        const colorGradient = getLeagueColor(league.id);
                        const currentPick = weeklyPicks?.[league.id];
                        const canMakePick = league.status === 'active' && currentEpisode;

                        return (
                          <div
                            key={league.id}
                            className="px-4 sm:px-6 py-4 hover:bg-cream-50 transition cursor-pointer group"
                            onClick={() => navigate(`/leagues/${league.id}`)}
                          >
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-3 flex items-center gap-3">
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
                                </div>
                              </div>

                              <div className="col-span-2 text-center">
                                <span className="text-neutral-700">
                                  {leagueMemberCount}/{league.max_players}
                                </span>
                              </div>

                              {/* Weekly Pick Column */}
                              <div className="col-span-3 text-center">
                                {canMakePick ? (
                                  currentPick ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <img
                                        src={currentPick.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPick.name}`}
                                        alt={currentPick.name}
                                        className="w-6 h-6 rounded-full object-cover"
                                      />
                                      <span className="text-sm text-neutral-700 font-medium truncate max-w-[80px]">
                                        {currentPick.name.split(' ')[0]}
                                      </span>
                                      <Check className="h-4 w-4 text-green-500" />
                                    </div>
                                  ) : (
                                    <Link
                                      to={`/leagues/${league.id}/pick`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-200 transition"
                                    >
                                      <Target className="h-3 w-3" />
                                      Make Pick
                                    </Link>
                                  )
                                ) : league.status === 'drafting' ? (
                                  <span className="text-xs text-amber-600">Draft first</span>
                                ) : (
                                  <span className="text-xs text-neutral-400">—</span>
                                )}
                              </div>

                              <div className="col-span-2 text-center">
                                {isCommissioner ? (
                                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-full text-xs font-semibold">
                                    <Crown className="h-3 w-3" />
                                    Creator
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 px-2 py-1 rounded-full text-xs font-semibold">
                                    Member
                                  </span>
                                )}
                              </div>

                              <div className="col-span-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Link
                                    to={`/leagues/${league.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-burgundy-600 font-semibold text-sm inline-flex items-center gap-1"
                                  >
                                    View <ArrowRight className="h-4 w-4" />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Join a League Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-cream-200 overflow-hidden">
            <div className="bg-cream-50 px-4 sm:px-6 py-4 border-b border-cream-200">
              <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                <Globe className="h-5 w-5 text-teal-600" />
                Join a League
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Browse public leagues or enter an invite code
              </p>
            </div>

            {/* Join with Code Section */}
            <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-cream-50 to-amber-50 border-b border-cream-200">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-burgundy-500" />
                    Have an invite code?
                  </h3>
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

            {/* Search */}
            <div className="px-4 sm:px-6 py-4 border-b border-cream-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search public leagues..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-cream-200 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Public Leagues Table Header */}
            <div className="bg-cream-50 px-4 sm:px-6 py-3 border-b border-cream-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-neutral-600">
                <div className="col-span-4">League</div>
                <div className="col-span-2 text-center">Members</div>
                <div className="col-span-2 text-center">Type</div>
                <div className="col-span-2 text-center">Donation</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
            </div>

            {/* Public Leagues List */}
            <div className="divide-y divide-cream-100">
              {filteredJoinableLeagues?.map((league) => {
                const leagueMemberCount = memberCounts?.[league.id] || 0;
                const isFull = leagueMemberCount >= league.max_players;
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
                          <p className="text-xs text-neutral-500">
                            {league.commissioner?.display_name || 'League Creator'}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-2 text-center">
                        <span className="text-neutral-700">
                          {leagueMemberCount}/{league.max_players}
                        </span>
                      </div>

                      <div className="col-span-2 text-center">
                        {league.is_public ? (
                          <span className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 px-2 py-1 rounded-full text-xs font-semibold border border-teal-200">
                            <Globe className="h-3 w-3" />
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-1 rounded-full text-xs font-semibold border border-purple-200">
                            <Lock className="h-3 w-3" />
                            Private
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        {league.require_donation && league.donation_amount ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold border border-emerald-200">
                            ${league.donation_amount.toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-sm">Free</span>
                        )}
                      </div>

                      <div className="col-span-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isFull ? (
                            <Link
                              to={`/join/${league.code}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-burgundy-600 font-semibold text-sm inline-flex items-center gap-1 bg-burgundy-50 px-3 py-1.5 rounded-lg hover:bg-burgundy-100 transition"
                            >
                              Join <ArrowRight className="h-4 w-4" />
                            </Link>
                          ) : (
                            <span className="text-xs text-red-500 font-semibold bg-red-50 px-3 py-1.5 rounded-lg">
                              Full
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredJoinableLeagues?.length === 0 && (
                <div className="px-6 py-10 text-center text-neutral-500">
                  {search
                    ? 'No leagues match your search'
                    : 'No public leagues available to join'}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
