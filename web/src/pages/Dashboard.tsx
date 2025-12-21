import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Flame, Users, Trophy, Calendar, ChevronRight, Megaphone, Clock, UserPlus } from 'lucide-react';

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
  castaway_id: string;
  castaway: Castaway;
}

export function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id)
        .single();
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
        .select(`
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
        `)
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data as any[]).map(d => ({
        league_id: d.league_id,
        total_points: d.total_points,
        rank: d.rank,
        league: d.league as League
      })).filter(d => d.league !== null) as LeagueMembership[];
    },
    enabled: !!user?.id,
  });

  // Fetch rosters for each league
  const { data: myRosters } = useQuery({
    queryKey: ['my-rosters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rosters')
        .select(`
          league_id,
          castaway_id,
          castaway:castaways (
            id,
            name,
            photo_url,
            status
          )
        `)
        .eq('user_id', user!.id)
        .is('dropped_at', null);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  // Group rosters by league
  const rostersByLeague = myRosters?.reduce((acc, roster) => {
    if (!acc[roster.league_id]) acc[roster.league_id] = [];
    acc[roster.league_id].push(roster);
    return acc;
  }, {} as Record<string, RosterEntry[]>) || {};

  const nonGlobalLeagues = myLeagues?.filter(l => !l.league.is_global) || [];

  // Mock announcements - in production, fetch from database
  const announcements = [
    {
      id: 1,
      title: 'Season 50 Registration Opening Soon!',
      message: 'Get ready for the biggest season yet. Registration opens December 19th.',
      type: 'info',
      date: '2025-12-21'
    }
  ];

  return (
    <div className="pb-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-800">
            Welcome back, {profile?.display_name || 'Survivor'}!
          </h1>
          <p className="text-neutral-500 mt-1">Here's your fantasy command center</p>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mb-8">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-6 text-white shadow-elevated"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Megaphone className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{announcement.title}</h3>
                    <p className="text-burgundy-100 mt-1">{announcement.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            to="/leagues/create"
            className="bg-white rounded-2xl p-5 shadow-card hover:shadow-elevated transition-all group border border-cream-200"
          >
            <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-burgundy-500 transition-colors">
              <Users className="h-6 w-6 text-burgundy-500 group-hover:text-white transition-colors" />
            </div>
            <p className="font-semibold text-neutral-800">Create League</p>
            <p className="text-sm text-neutral-400 mt-1">Start your own</p>
          </Link>

          <Link
            to="/leagues"
            className="bg-white rounded-2xl p-5 shadow-card hover:shadow-elevated transition-all group border border-cream-200"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-500 transition-colors">
              <UserPlus className="h-6 w-6 text-green-600 group-hover:text-white transition-colors" />
            </div>
            <p className="font-semibold text-neutral-800">Join League</p>
            <p className="text-sm text-neutral-400 mt-1">Find a league</p>
          </Link>

          <Link
            to="/leaderboard"
            className="bg-white rounded-2xl p-5 shadow-card hover:shadow-elevated transition-all group border border-cream-200"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-500 transition-colors">
              <Trophy className="h-6 w-6 text-amber-600 group-hover:text-white transition-colors" />
            </div>
            <p className="font-semibold text-neutral-800">Leaderboard</p>
            <p className="text-sm text-neutral-400 mt-1">Global rankings</p>
          </Link>

          <Link
            to="/castaways"
            className="bg-white rounded-2xl p-5 shadow-card hover:shadow-elevated transition-all group border border-cream-200"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-500 transition-colors">
              <Flame className="h-6 w-6 text-orange-500 group-hover:text-white transition-colors" />
            </div>
            <p className="font-semibold text-neutral-800">Castaways</p>
            <p className="text-sm text-neutral-400 mt-1">View all players</p>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* My Leagues - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-neutral-800">My Leagues</h2>
              <Link to="/leagues" className="text-burgundy-500 hover:text-burgundy-600 text-sm font-semibold flex items-center gap-1">
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
                      className="block bg-white rounded-2xl shadow-card hover:shadow-elevated transition-all border border-cream-200 overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg text-neutral-800">{membership.league.name}</h3>
                            <p className="text-sm text-neutral-400 font-mono">{membership.league.code}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-display text-burgundy-500">{membership.total_points}</p>
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
                                {roster.castaway?.photo_url ? (
                                  <img
                                    src={roster.castaway.photo_url}
                                    alt={roster.castaway?.name}
                                    className={`w-10 h-10 rounded-full object-cover ${
                                      roster.castaway?.status === 'eliminated' ? 'grayscale' : ''
                                    }`}
                                  />
                                ) : (
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    roster.castaway?.status === 'eliminated'
                                      ? 'bg-neutral-300'
                                      : 'bg-burgundy-100'
                                  }`}>
                                    <Flame className={`h-5 w-5 ${
                                      roster.castaway?.status === 'eliminated'
                                        ? 'text-neutral-500'
                                        : 'text-burgundy-500'
                                    }`} />
                                  </div>
                                )}
                                <div>
                                  <p className={`font-medium text-sm ${
                                    roster.castaway?.status === 'eliminated'
                                      ? 'text-neutral-500 line-through'
                                      : 'text-neutral-800'
                                  }`}>
                                    {roster.castaway?.name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-neutral-400">
                                    {roster.castaway?.status === 'eliminated' ? 'Eliminated' : 'Active'}
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
                            <span className="font-semibold text-burgundy-500">#{membership.rank}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-card p-12 text-center border border-cream-200">
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
            <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-burgundy-100 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-burgundy-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-800">Season 50</h3>
                  <p className="text-sm text-neutral-400">{activeSeason?.name || 'Coming Soon'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Registration Opens</span>
                  <span className="text-burgundy-500 font-semibold">Dec 19, 2025</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Premiere</span>
                  <span className="text-neutral-800 font-semibold">Feb 25, 2026</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Draft Deadline</span>
                  <span className="text-neutral-800 font-semibold">Mar 2, 2026</span>
                </div>
              </div>
            </div>

            {/* Upcoming */}
            <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="font-semibold text-neutral-800">Coming Up</h3>
              </div>
              <p className="text-sm text-neutral-500">
                Season 50 registration opens December 19th. Make sure to create or join a league before the draft deadline!
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
