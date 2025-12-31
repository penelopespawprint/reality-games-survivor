/**
 * Dashboard Page
 *
 * Main user dashboard showing leagues, stats, and quick actions.
 * Refactored to use centralized components and hooks.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Users, ChevronRight } from 'lucide-react';
import { Footer } from '@/components/Footer';

// Dashboard components
import {
  WeeklyPhaseBanner,
  AlertBanners,
  QuickActionsGrid,
  StatsRow,
  GlobalRankCard,
  LeagueCard,
  SeasonInfoCard,
  WeeklyTimelineCard,
  QuickLinksCard,
  TriviaCalloutCard,
  AnnouncementsCard,
} from '@/components/dashboard';

// Types and utilities
import type { UserProfile, Season, Episode, League, LeagueMembership } from '@/types';
import { getGamePhase, getWeeklyPhase } from '@/lib/game-phase';

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

export function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('*').eq('id', user!.id).single();
      if (error) {
        // If profile doesn't exist yet, return null instead of throwing
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      return data as UserProfile;
    },
    enabled: !!user?.id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
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
        .filter((d) => d.league !== null) as (LeagueMembership & { league: League })[];
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

      const { data, error } = await supabase
        .from('castaways')
        .select('id, name')
        .eq('eliminated_episode_id', previousEpisode.id);

      if (error) throw error;

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

  // Check if user has made picks for the next episode (to determine if "Make Your Pick" should show)
  const { data: nextEpisodePicks } = useQuery({
    queryKey: ['next-episode-picks', user?.id, nextEpisode?.id],
    queryFn: async () => {
      if (!nextEpisode || !myLeagues) return [];

      const leagueIds = myLeagues.filter((l) => !l.league.is_global).map((l) => l.league_id);
      if (leagueIds.length === 0) return [];

      const { data, error } = await supabase
        .from('weekly_picks')
        .select('league_id')
        .eq('user_id', user!.id)
        .eq('episode_id', nextEpisode.id)
        .in('league_id', leagueIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!nextEpisode?.id && !!myLeagues,
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

  const primaryLeagueId = nonGlobalLeagues.length > 0 ? nonGlobalLeagues[0].league_id : undefined;

  return (
    <div className="pb-4">
      {/* Welcome Header - Reduced spacing */}
      <div className="mb-4">
        <h1 className="text-2xl font-display font-bold text-neutral-800">
          Welcome back{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}.
        </h1>
        <p className="text-neutral-500 mt-1 text-base">
          Check standings, track scores, and see how your strategy is playing out.
        </p>
      </div>

      {/* Trivia Bar - Above the fold */}
      <div className="mb-4">
        <TriviaCalloutCard seasonStarted={gamePhase === 'active' || gamePhase === 'post_season'} />
      </div>

      {/* Weekly Phase Banner */}
      {weeklyPhase && (
        <div className="mb-4">
          <WeeklyPhaseBanner weeklyPhase={weeklyPhase} primaryLeagueId={primaryLeagueId} />
        </div>
      )}

      {/* Alert Banners */}
      <AlertBanners recentlyEliminated={recentlyEliminated} autoPickedLeagues={autoPickedLeagues} />

      {/* Announcements Section - Above draft rankings */}
      <div className="mb-4">
        <AnnouncementsCard />
      </div>

      {/* Quick Actions Grid */}
      <div className="mb-4">
        <QuickActionsGrid
          gamePhase={gamePhase}
          activeSeason={activeSeason || null}
          nextEpisode={nextEpisode || null}
          primaryLeagueId={primaryLeagueId}
          castawayCount={castawayCount || 0}
          hasPickedForNextEpisode={
            (nextEpisodePicks?.length || 0) >= nonGlobalLeagues.length &&
            nonGlobalLeagues.length > 0
          }
        />
      </div>

      {/* Stats Row */}
      <div className="mb-4">
        <StatsRow
          leagueCount={nonGlobalLeagues.length}
          activeCastaways={activeCastaways}
          totalPoints={totalPoints}
        />
      </div>

      {/* Global Rank Card */}
      {globalLeague?.rank && (
        <div className="mb-4">
          <GlobalRankCard rank={globalLeague.rank} totalPoints={globalLeague.total_points} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Leagues - Main Content */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-neutral-800">My Leagues</h2>
            <Link
              to="/leagues"
              className="text-burgundy-500 hover:text-burgundy-600 text-sm font-semibold flex items-center gap-1"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {nonGlobalLeagues.length > 0 ? (
            <div className="space-y-3">
              {nonGlobalLeagues.map((membership) => (
                <LeagueCard
                  key={membership.league_id}
                  leagueId={membership.league_id}
                  leagueName={membership.league.name}
                  leagueCode={membership.league.code}
                  totalPoints={membership.total_points}
                  rank={membership.rank}
                  rosters={rostersByLeague[membership.league_id] || []}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-cream-200">
              <div className="w-12 h-12 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-neutral-400" />
              </div>
              <h3 className="font-semibold text-neutral-800 mb-2">No leagues yet</h3>
              <p className="text-neutral-500 mb-4">Join or create a league to start playing!</p>
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
        <div className="space-y-4">
          {activeSeason && <SeasonInfoCard season={activeSeason} />}
          <WeeklyTimelineCard />
          <QuickLinksCard />
        </div>
      </div>

      <Footer />
    </div>
  );
}
