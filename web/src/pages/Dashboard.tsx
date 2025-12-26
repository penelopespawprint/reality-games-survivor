import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { getAvatarUrl } from '@/lib/avatar';
import {
  Flame,
  Users,
  Trophy,
  Calendar,
  ChevronRight,
  Clock,
  Target,
  ListChecks,
  BookOpen,
  Zap,
  TrendingUp,
  Play,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { Footer } from '@/components/Footer';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

interface Season {
  id: string;
  number: number;
  name: string;
  is_active: boolean;
  premiere_at: string;
  registration_opens_at: string;
  draft_deadline: string;
}

interface League {
  id: string;
  name: string;
  code: string;
  status: string;
  is_global: boolean;
}

interface LeagueMembership {
  league_id: string;
  total_points: number;
  rank: number | null;
  league: League;
}

interface Castaway {
  id: string;
  name: string;
  photo_url: string | null;
  status: 'active' | 'eliminated' | 'winner';
}

interface RosterEntry {
  league_id: string;
  castaway_id: string;
  castaway: Castaway;
}

interface Episode {
  id: string;
  number: number;
  title: string | null;
  air_date: string;
  picks_lock_at: string;
  is_scored: boolean;
}

// Game phase detection
type GamePhase =
  | 'pre_registration'
  | 'registration'
  | 'pre_draft'
  | 'draft'
  | 'pre_season'
  | 'active'
  | 'post_season';

// Weekly phase detection (for active game)
type WeeklyPhase = 'make_pick' | 'picks_locked' | 'awaiting_results' | 'results_posted';

interface WeeklyPhaseInfo {
  phase: WeeklyPhase;
  label: string;
  description: string;
  ctaLabel: string;
  ctaPath: string;
  color: 'burgundy' | 'orange' | 'amber' | 'green' | 'blue';
  countdown?: { label: string; targetTime: Date };
}

function getGamePhase(season: Season | null, nextEpisode: Episode | null): GamePhase {
  if (!season) return 'pre_registration';

  const now = new Date();
  const registrationOpens = new Date(season.registration_opens_at);
  const premiere = new Date(season.premiere_at);

  if (now < registrationOpens) return 'pre_registration';
  if (now < premiere) return 'pre_draft';
  if (nextEpisode) return 'active';
  return 'post_season';
}

function getWeeklyPhase(
  episode: Episode | null,
  previousEpisode: Episode | null
): WeeklyPhaseInfo | null {
  if (!episode) return null;

  const now = new Date();
  const picksLock = new Date(episode.picks_lock_at);
  const airDate = new Date(episode.air_date);

  // Calculate approximate times (using typical schedule from CLAUDE.md)
  const resultsPosted = new Date(airDate);
  resultsPosted.setDate(resultsPosted.getDate() + 2); // Friday (2 days after Wednesday air)
  resultsPosted.setHours(12, 0, 0, 0);

  const nextPickOpens = new Date(resultsPosted);
  nextPickOpens.setDate(nextPickOpens.getDate() + 1); // Saturday
  nextPickOpens.setHours(12, 0, 0, 0);

  // Check if previous episode was just scored (results posted phase)
  if (previousEpisode?.is_scored && now < nextPickOpens) {
    return {
      phase: 'results_posted',
      label: 'Results Posted',
      description: `Episode ${previousEpisode.number} scores are in! Check your points.`,
      ctaLabel: 'View Results',
      ctaPath: '/episodes',
      color: 'green',
    };
  }

  // Before picks lock - make your pick
  if (now < picksLock) {
    return {
      phase: 'make_pick',
      label: 'Make Your Pick',
      description: `Choose your castaway for Episode ${episode.number}`,
      ctaLabel: 'Make Pick',
      ctaPath: '/pick',
      color: 'burgundy',
      countdown: { label: 'Picks lock in', targetTime: picksLock },
    };
  }

  // Between picks lock and episode airing
  if (now < airDate) {
    return {
      phase: 'picks_locked',
      label: 'Picks Locked',
      description: 'Your pick is locked. Episode airs tonight!',
      ctaLabel: 'View Pick',
      ctaPath: '/pick',
      color: 'orange',
      countdown: { label: 'Episode airs in', targetTime: airDate },
    };
  }

  // After episode aired but before results
  if (!episode.is_scored) {
    return {
      phase: 'awaiting_results',
      label: 'Awaiting Results',
      description: 'Episode has aired. Results coming Friday!',
      ctaLabel: 'View Teams',
      ctaPath: '/team',
      color: 'amber',
    };
  }

  return null;
}

function getCountdownText(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) return 'Now';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').eq('id', user!.id).single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const { data: activeSeason } = useQuery({
    queryKey: ['active-season'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Season | null;
    },
  });

  // Fetch leagues with membership details
  const { data: myLeagues } = useQuery({
    queryKey: ['my-leagues-detailed', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_members')
        .select(
          `
          league_id,
          total_points,
          rank,
          league:leagues (
            id,
            name,
            code,
            status,
            is_global
          )
        `
        )
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data as any[])
        .map((d) => ({
          league_id: d.league_id,
          total_points: d.total_points,
          rank: d.rank,
          league: d.league as League,
        }))
        .filter((d) => d.league !== null) as LeagueMembership[];
    },
    enabled: !!user?.id,
  });

  // Fetch rosters for each league
  const { data: myRosters } = useQuery({
    queryKey: ['my-rosters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rosters')
        .select(
          `
          league_id,
          castaway_id,
          castaway:castaways (
            id,
            name,
            photo_url,
            status
          )
        `
        )
        .eq('user_id', user!.id)
        .is('dropped_at', null);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  // Fetch next upcoming episode
  const { data: nextEpisode } = useQuery({
    queryKey: ['next-episode', activeSeason?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', activeSeason!.id)
        .gt('air_date', new Date().toISOString())
        .order('air_date', { ascending: true })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Episode | null;
    },
    enabled: !!activeSeason?.id,
  });

  // Fetch most recent scored episode for results display
  const { data: previousEpisode } = useQuery({
    queryKey: ['previous-episode', activeSeason?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', activeSeason!.id)
        .eq('is_scored', true)
        .order('air_date', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Episode | null;
    },
    enabled: !!activeSeason?.id,
  });

  // Fetch castaway count for the active season
  const { data: castawayCount } = useQuery({
    queryKey: ['castaway-count', activeSeason?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('castaways')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', activeSeason!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeSeason?.id,
  });

  // Check for eliminated castaways (recently eliminated from user's roster)
  const { data: recentlyEliminated } = useQuery({
    queryKey: ['recently-eliminated', user?.id, previousEpisode?.id],
    queryFn: async () => {
      if (!myRosters || !previousEpisode) return [];

      // Get castaways that were eliminated in the previous episode
      const { data, error } = await supabase
        .from('castaways')
        .select('id, name')
        .eq('eliminated_episode_id', previousEpisode.id);

      if (error) throw error;

      // Filter to only castaways the user had on their roster
      const userCastawayIds = myRosters.map((r) => r.castaway_id);
      return data?.filter((c) => userCastawayIds.includes(c.id)) || [];
    },
    enabled: !!user?.id && !!previousEpisode?.id && !!myRosters,
  });

  // Check if user was auto-picked in any league recently
  const { data: autoPickedLeagues } = useQuery({
    queryKey: ['auto-picked', user?.id, previousEpisode?.id],
    queryFn: async () => {
      if (!previousEpisode || !myLeagues) return [];

      const leagueIds = myLeagues.filter((l) => !l.league.is_global).map((l) => l.league_id);
      if (leagueIds.length === 0) return [];

      const { data, error } = await supabase
        .from('weekly_picks')
        .select('league_id, leagues(name)')
        .eq('user_id', user!.id)
        .eq('episode_id', previousEpisode.id)
        .eq('status', 'auto_picked')
        .in('league_id', leagueIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!previousEpisode?.id && !!myLeagues,
  });

  // Group rosters by league
  const rostersByLeague =
    myRosters?.reduce(
      (acc, roster) => {
        if (!acc[roster.league_id]) acc[roster.league_id] = [];
        acc[roster.league_id].push(roster);
        return acc;
      },
      {} as Record<string, RosterEntry[]>
    ) || {};

  const nonGlobalLeagues = myLeagues?.filter((l) => !l.league.is_global) || [];
  const globalLeague = myLeagues?.find((l) => l.league.is_global);
  const gamePhase = getGamePhase(activeSeason || null, nextEpisode || null);
  const weeklyPhase =
    gamePhase === 'active' ? getWeeklyPhase(nextEpisode || null, previousEpisode || null) : null;

  // Calculate stats
  const totalPoints = globalLeague?.total_points || 0;
  const activeCastaways = Object.values(rostersByLeague)
    .flat()
    .filter((r: any) => r.castaway?.status === 'active').length;

  return (
    <div className="pb-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-neutral-800">
          Welcome back{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}.
        </h1>
        <p className="text-neutral-500 mt-2 text-lg">
          Check standings, track scores, and see how your strategy is playing out.
        </p>
      </div>

      {/* Weekly Phase Banner */}
      {weeklyPhase && (
        <div
          className={`rounded-2xl p-6 mb-8 ${
            weeklyPhase.color === 'burgundy'
              ? 'bg-gradient-to-r from-burgundy-500 to-burgundy-600 text-white'
              : weeklyPhase.color === 'orange'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                : weeklyPhase.color === 'amber'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                  : weeklyPhase.color === 'green'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-3 h-3 rounded-full ${
                    weeklyPhase.phase === 'make_pick'
                      ? 'bg-white animate-pulse'
                      : weeklyPhase.phase === 'picks_locked'
                        ? 'bg-white/80'
                        : 'bg-white/60'
                  }`}
                />
                <span className="text-sm font-semibold opacity-90 uppercase tracking-wide">
                  {weeklyPhase.label}
                </span>
              </div>
              <p className="text-lg font-medium">{weeklyPhase.description}</p>
              {weeklyPhase.countdown && (
                <p className="text-sm opacity-80 mt-1">
                  {weeklyPhase.countdown.label}:{' '}
                  {getCountdownText(weeklyPhase.countdown.targetTime)}
                </p>
              )}
            </div>
            {nonGlobalLeagues.length > 0 && (
              <Link
                to={`/leagues/${nonGlobalLeagues[0].league_id}${weeklyPhase.ctaPath}`}
                className={`btn ${
                  weeklyPhase.color === 'burgundy'
                    ? 'bg-white text-burgundy-600 hover:bg-cream-100'
                    : weeklyPhase.color === 'orange'
                      ? 'bg-white text-orange-600 hover:bg-cream-100'
                      : weeklyPhase.color === 'amber'
                        ? 'bg-white text-amber-600 hover:bg-cream-100'
                        : weeklyPhase.color === 'green'
                          ? 'bg-white text-green-600 hover:bg-cream-100'
                          : 'bg-white text-blue-600 hover:bg-cream-100'
                } font-semibold`}
              >
                {weeklyPhase.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Alert Banners */}
      <div className="space-y-3 mb-6">
        {/* Eliminated Castaway Alert */}
        {recentlyEliminated && recentlyEliminated.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-800">
                {recentlyEliminated.length === 1
                  ? `${recentlyEliminated[0].name} was eliminated!`
                  : `${recentlyEliminated.map((c) => c.name).join(' and ')} were eliminated!`}
              </p>
              <p className="text-sm text-red-700 mt-1">
                {recentlyEliminated.length === 1
                  ? 'The tribe has spoken. You still have your other castaway to play for!'
                  : 'The tribe has spoken. Your season may be impacted by these eliminations.'}
              </p>
            </div>
          </div>
        )}

        {/* Auto-Pick Alert */}
        {autoPickedLeagues && autoPickedLeagues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                You were auto-picked in{' '}
                {autoPickedLeagues.length === 1
                  ? (autoPickedLeagues[0] as any).leagues?.name || 'a league'
                  : `${autoPickedLeagues.length} leagues`}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                You didn't submit a pick in time last episode. Make sure to pick before the deadline
                this week!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Primary CTA based on phase */}
        {gamePhase === 'pre_draft' || gamePhase === 'pre_registration' ? (
          <Link
            to="/draft/rankings"
            className="col-span-2 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-2xl p-6 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <ListChecks className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl">Set Your Draft Rankings</h3>
                <p className="text-burgundy-100 text-sm mt-1">
                  Rank all 24 castaways before the draft
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
            </div>
            {activeSeason && (
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
                <Clock className="h-4 w-4 text-burgundy-200" />
                <span className="text-sm text-burgundy-100">
                  Premiere in {getCountdownText(new Date(activeSeason.premiere_at))}
                </span>
              </div>
            )}
          </Link>
        ) : gamePhase === 'active' && nextEpisode ? (
          <Link
            to={
              nonGlobalLeagues.length > 0
                ? `/leagues/${nonGlobalLeagues[0].league_id}/pick`
                : '/leagues'
            }
            className="col-span-2 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-2xl p-6 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Target className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl">Make Your Pick</h3>
                <p className="text-burgundy-100 text-sm mt-1">
                  Episode {nextEpisode.number} — Lock in before Wednesday
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
              <Clock className="h-4 w-4 text-burgundy-200" />
              <span className="text-sm text-burgundy-100">
                Picks lock in {getCountdownText(new Date(nextEpisode.picks_lock_at))}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            to="/leaderboard"
            className="col-span-2 bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-2xl p-6 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Trophy className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl">View Final Standings</h3>
                <p className="text-burgundy-100 text-sm mt-1">
                  {activeSeason
                    ? `Season ${activeSeason.number} results are in!`
                    : 'Results are in!'}
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-white/60 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* Scoring Rules */}
        <Link
          to="/scoring"
          className="bg-white hover:bg-cream-50 border-2 border-cream-200 hover:border-burgundy-300 rounded-2xl p-5 transition-all group"
        >
          <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-burgundy-500 transition-colors">
            <BookOpen className="h-6 w-6 text-burgundy-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-neutral-800">Scoring Rules</h3>
          <p className="text-neutral-500 text-sm mt-1">See how you score</p>
        </Link>

        {/* View Castaways */}
        <Link
          to="/castaways"
          className="bg-white hover:bg-cream-50 border-2 border-cream-200 hover:border-burgundy-300 rounded-2xl p-5 transition-all group"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-500 transition-colors">
            <Flame className="h-6 w-6 text-orange-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-neutral-800">{castawayCount || 24} Castaways</h3>
          <p className="text-neutral-500 text-sm mt-1">Meet the players</p>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
          <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-burgundy-500" />
          </div>
          <p className="text-3xl font-display font-bold text-neutral-800">
            {nonGlobalLeagues.length}
          </p>
          <p className="text-sm text-neutral-500 mt-1">My Leagues</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
          <p className="text-3xl font-display font-bold text-neutral-800">{activeCastaways}</p>
          <p className="text-sm text-neutral-500 mt-1">Active Castaways</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Zap className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-3xl font-display font-bold text-neutral-800">{totalPoints}</p>
          <p className="text-sm text-neutral-500 mt-1">Total Points</p>
        </div>
      </div>

      {/* Global Rank Card */}
      {globalLeague?.rank && (
        <Link
          to="/leaderboard"
          className="block bg-white hover:bg-cream-50 rounded-2xl p-6 border border-cream-200 mb-8 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                <TrendingUp className="h-7 w-7 text-amber-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-neutral-800">Your Global Rank</h3>
                <p className="text-neutral-500 text-sm">
                  {globalLeague.total_points} points earned this season
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-display font-bold text-burgundy-500">
                #{globalLeague.rank}
              </p>
              <p className="text-xs text-neutral-400 mt-1">out of all players</p>
            </div>
          </div>
        </Link>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* My Leagues - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-neutral-800">My Leagues</h2>
            <Link
              to="/leagues"
              className="text-burgundy-500 hover:text-burgundy-600 text-sm font-semibold flex items-center gap-1"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {nonGlobalLeagues.length > 0 ? (
            <div className="space-y-4">
              {nonGlobalLeagues.map((membership) => {
                const leagueRosters = rostersByLeague[membership.league_id] || [];
                return (
                  <Link
                    key={membership.league_id}
                    to={`/leagues/${membership.league_id}`}
                    className="block bg-white rounded-2xl hover:bg-cream-50 transition-colors border border-cream-200 overflow-hidden group"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg text-neutral-800 group-hover:text-burgundy-600 transition-colors">
                            {membership.league.name}
                          </h3>
                          <p className="text-sm text-neutral-400 font-mono">
                            {membership.league.code}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-display text-burgundy-500">
                            {membership.total_points}
                          </p>
                          <p className="text-xs text-neutral-400">points</p>
                        </div>
                      </div>

                      {/* Castaways */}
                      <div className="flex gap-3">
                        {leagueRosters.length > 0 ? (
                          leagueRosters.map((roster: any) => (
                            <div
                              key={roster.castaway_id}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl flex-1 ${
                                roster.castaway?.status === 'eliminated'
                                  ? 'bg-neutral-100 opacity-60'
                                  : 'bg-cream-50'
                              }`}
                            >
                              <img
                                src={getAvatarUrl(
                                  roster.castaway?.name || 'Unknown',
                                  roster.castaway?.photo_url
                                )}
                                alt={roster.castaway?.name || 'Castaway'}
                                className={`w-10 h-10 rounded-full object-cover ${
                                  roster.castaway?.status === 'eliminated' ? 'grayscale' : ''
                                }`}
                              />
                              <div>
                                <p
                                  className={`font-medium text-sm ${
                                    roster.castaway?.status === 'eliminated'
                                      ? 'text-neutral-500 line-through'
                                      : 'text-neutral-800'
                                  }`}
                                >
                                  {roster.castaway?.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-neutral-400">
                                  {roster.castaway?.status === 'eliminated'
                                    ? 'Eliminated'
                                    : 'Active'}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex-1 text-center py-4 bg-cream-50 rounded-xl">
                            <p className="text-sm text-neutral-400">No castaways drafted yet</p>
                          </div>
                        )}
                      </div>

                      {/* Rank indicator */}
                      {membership.rank && (
                        <div className="mt-4 pt-4 border-t border-cream-100 flex items-center justify-between">
                          <span className="text-sm text-neutral-500">Your Rank</span>
                          <span className="font-semibold text-burgundy-500">
                            #{membership.rank}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-cream-200">
              <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="font-semibold text-neutral-800 mb-2">No leagues yet</h3>
              <p className="text-neutral-500 mb-6">Join or create a league to start playing!</p>
              <div className="flex gap-3 justify-center">
                <Link to="/leagues/create" className="btn btn-primary">
                  Create League
                </Link>
                <Link to="/leagues" className="btn btn-secondary">
                  Browse Leagues
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Season Info */}
          {activeSeason && (
            <div className="bg-white rounded-2xl p-6 border border-cream-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-burgundy-100 rounded-xl flex items-center justify-center">
                  <Play className="h-5 w-5 text-burgundy-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-800">Season {activeSeason.number}</h3>
                  <p className="text-sm text-neutral-400">{activeSeason.name}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Registration Opens</span>
                  <span className="text-burgundy-500 font-semibold">
                    {formatDate(activeSeason.registration_opens_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Premiere</span>
                  <span className="text-neutral-800 font-semibold">
                    {formatDate(activeSeason.premiere_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Draft Deadline</span>
                  <span className="text-neutral-800 font-semibold">
                    {formatDate(activeSeason.draft_deadline)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Timeline */}
          <div className="bg-white rounded-2xl p-6 border border-cream-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-neutral-800">Weekly Timeline</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-burgundy-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-neutral-800">Wednesday 3pm PST</p>
                  <p className="text-xs text-neutral-500">Picks lock for the week</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-neutral-800">Wednesday 8pm EST</p>
                  <p className="text-xs text-neutral-500">Episode airs (live scoring!)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-neutral-800">Friday 12pm PST</p>
                  <p className="text-xs text-neutral-500">Official results posted</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-neutral-800">Saturday 12pm PST</p>
                  <p className="text-xs text-neutral-500">Next week's picks open</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl p-6 border border-cream-200">
            <h3 className="font-semibold text-neutral-800 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link
                to="/how-to-play"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 transition-colors"
              >
                <BookOpen className="h-5 w-5 text-neutral-400" />
                <span className="text-sm text-neutral-700">How to Play</span>
                <ChevronRight className="h-4 w-4 text-neutral-300 ml-auto" />
              </Link>
              <Link
                to="/scoring"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 transition-colors"
              >
                <Target className="h-5 w-5 text-neutral-400" />
                <span className="text-sm text-neutral-700">Scoring Rules</span>
                <ChevronRight className="h-4 w-4 text-neutral-300 ml-auto" />
              </Link>
              <Link
                to="/castaways"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 transition-colors"
              >
                <Flame className="h-5 w-5 text-neutral-400" />
                <span className="text-sm text-neutral-700">View Castaways</span>
                <ChevronRight className="h-4 w-4 text-neutral-300 ml-auto" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
