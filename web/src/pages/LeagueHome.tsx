import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Users,
  Loader2,
  Crown,
  Settings,
  Share2,
  Flame,
  Heart,
  BarChart3,
  Target,
  Clock,
  Medal,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';
import { LeagueChat } from '@/components/LeagueChat';
import { useAuth } from '@/lib/auth';
import { getAvatarUrl } from '@/lib/avatar';

type Tab = 'overview' | 'players' | 'standings';

export default function LeagueHome() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState(false);

  // Fetch league details
  const { data: league, isLoading: leagueLoading } = useQuery({
    queryKey: ['league', id],
    queryFn: async () => {
      if (!id) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select(
          `
          *,
          seasons(*),
          commissioner:users!leagues_commissioner_id_fkey(id, display_name)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch league members with standings
  const { data: members } = useQuery({
    queryKey: ['league-members', id],
    queryFn: async () => {
      if (!id) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('league_members')
        .select('*, users(id, display_name, avatar_url)')
        .eq('league_id', id)
        .order('total_points', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch all rosters for this league (for the players tab)
  const { data: allRosters } = useQuery({
    queryKey: ['league-rosters', id],
    queryFn: async () => {
      if (!id) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('rosters')
        .select(
          `
          *,
          castaways(id, name, photo_url, status),
          users(id, display_name)
        `
        )
        .eq('league_id', id)
        .is('dropped_at', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch current user's roster
  const { data: myRoster } = useQuery({
    queryKey: ['my-roster', id, user?.id],
    queryFn: async () => {
      if (!id || !user?.id) return [];
      const { data, error } = await supabase
        .from('rosters')
        .select('*, castaways(*)')
        .eq('league_id', id)
        .eq('user_id', user.id)
        .is('dropped_at', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!user?.id,
  });

  // Fetch user profile for admin check
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch next episode for countdown
  const { data: nextEpisode } = useQuery({
    queryKey: ['next-episode', league?.season_id],
    queryFn: async () => {
      if (!league?.season_id) return null;
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', league.season_id)
        .gt('air_date', new Date().toISOString())
        .order('air_date', { ascending: true })
        .limit(1)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!league?.season_id,
  });

  const copyInviteCode = () => {
    if (league?.code) {
      navigator.clipboard.writeText(`${window.location.origin}/join/${league.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (leagueLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
        <p className="text-neutral-800">League not found</p>
      </div>
    );
  }

  const myMembership = members?.find((m) => m.user_id === user?.id);
  const isCommissioner = league?.commissioner_id === user?.id;
  const isAdmin = userProfile?.role === 'admin';
  const canManageLeague = isCommissioner || isAdmin;

  // Group rosters by user for the players tab
  const rostersByUser = allRosters?.reduce((acc: any, roster: any) => {
    const userId = roster.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: roster.users,
        castaways: [],
      };
    }
    acc[userId].castaways.push(roster.castaways);
    return acc;
  }, {});

  const getRankStyle = (rank: number) => {
    if (rank === 1)
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: <Crown className="h-4 w-4 text-yellow-500" />,
      };
    if (rank === 2)
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        icon: <Medal className="h-4 w-4 text-gray-400" />,
      };
    if (rank === 3)
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-600',
        icon: <Medal className="h-4 w-4 text-orange-400" />,
      };
    return { bg: 'bg-cream-50', text: 'text-neutral-600', icon: null };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />

      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-elevated p-6 border border-cream-200 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-neutral-800">{league.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-neutral-500">
                <Crown className="h-4 w-4 text-burgundy-400" />
                <span className="text-sm">{(league.commissioner as any)?.display_name}</span>
                <span className="text-neutral-300">·</span>
                <span className="text-sm">Season {league.seasons?.number}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyInviteCode}
                className="p-2 bg-cream-50 rounded-xl hover:bg-cream-100 transition-all border border-cream-200"
                title="Copy invite link"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Share2 className="h-5 w-5 text-neutral-600" />
                )}
              </button>
              {canManageLeague && (
                <Link
                  to={`/leagues/${id}/settings`}
                  className="p-2 bg-cream-50 rounded-xl hover:bg-cream-100 transition-all border border-cream-200"
                  title="League Settings"
                >
                  <Settings className="h-5 w-5 text-neutral-600" />
                </Link>
              )}
            </div>
          </div>

          {/* League Stats Bar */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-cream-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-800">{members?.length || 0}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Players</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-burgundy-600">#{myMembership?.rank || '-'}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Your Rank</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-800">
                {myMembership?.total_points || 0}
              </p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Your Points</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 capitalize">{league.status}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Status</p>
            </div>
          </div>

          {/* Charity Badge */}
          {league.require_donation && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-gradient-to-r from-burgundy-50 to-cream-50 rounded-xl border border-burgundy-100">
              <Heart className="h-5 w-5 text-burgundy-500 flex-shrink-0" />
              <div>
                <p className="text-burgundy-700 font-medium text-sm">
                  ${league.donation_amount} Charity Entry
                </p>
                <p className="text-burgundy-500 text-xs">
                  All proceeds donated to charity chosen by winner
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mini Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-burgundy-500 text-white shadow-md'
                : 'bg-white text-neutral-600 border border-cream-200 hover:border-burgundy-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'players'
                ? 'bg-burgundy-500 text-white shadow-md'
                : 'bg-white text-neutral-600 border border-cream-200 hover:border-burgundy-200'
            }`}
          >
            <Users className="h-4 w-4" />
            Players
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'standings'
                ? 'bg-burgundy-500 text-white shadow-md'
                : 'bg-white text-neutral-600 border border-cream-200 hover:border-burgundy-200'
            }`}
          >
            <Trophy className="h-4 w-4" />
            Standings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* My Team Card */}
            <div className="bg-white rounded-2xl shadow-card p-5 border border-cream-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
                  <Target className="h-5 w-5 text-burgundy-500" />
                  My Team
                </h2>
                <Link
                  to={`/leagues/${id}/team`}
                  className="text-burgundy-500 hover:text-burgundy-600 text-sm flex items-center gap-1"
                >
                  View Details <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {myRoster && myRoster.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {myRoster.map((roster: any) => (
                    <div
                      key={roster.id}
                      className={`relative rounded-xl overflow-hidden ${
                        roster.castaways?.status === 'eliminated' ? 'opacity-60' : ''
                      }`}
                    >
                      <div
                        className={`p-4 ${
                          roster.castaways?.status === 'eliminated'
                            ? 'bg-neutral-100 border border-neutral-200'
                            : 'bg-gradient-to-br from-cream-50 to-cream-100 border border-cream-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={getAvatarUrl(
                              roster.castaways?.name || 'Unknown',
                              roster.castaways?.photo_url
                            )}
                            alt={roster.castaways?.name || 'Castaway'}
                            className={`w-12 h-12 rounded-full object-cover border-2 ${
                              roster.castaways?.status === 'eliminated'
                                ? 'border-neutral-300 grayscale'
                                : 'border-burgundy-200'
                            }`}
                          />
                          <div>
                            <p className="font-semibold text-neutral-800">
                              {roster.castaways?.name}
                            </p>
                            <div className="flex items-center gap-1">
                              <Flame
                                className={`h-3 w-3 ${
                                  roster.castaways?.status === 'eliminated'
                                    ? 'text-neutral-400'
                                    : 'text-orange-500'
                                }`}
                              />
                              <span
                                className={`text-xs capitalize ${
                                  roster.castaways?.status === 'eliminated'
                                    ? 'text-neutral-500'
                                    : 'text-green-600'
                                }`}
                              >
                                {roster.castaways?.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-cream-50 rounded-xl border border-cream-200">
                  <Users className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">Draft hasn't started yet</p>
                  {league.draft_status === 'pending' && (
                    <Link
                      to={`/leagues/${id}/draft`}
                      className="text-burgundy-500 hover:text-burgundy-600 text-sm mt-2 inline-block"
                    >
                      Submit Draft Rankings →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Link
                to={`/leagues/${id}/pick`}
                className="bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-2xl p-5 shadow-elevated transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">Make Pick</p>
                  <p className="text-burgundy-200 text-sm">Choose this week's castaway</p>
                </div>
              </Link>
              <Link
                to={`/leagues/${id}/draft`}
                className="bg-white hover:bg-cream-50 text-neutral-800 rounded-2xl p-5 shadow-card border border-cream-200 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-burgundy-500" />
                </div>
                <div>
                  <p className="font-semibold">Draft Rankings</p>
                  <p className="text-neutral-500 text-sm">Rank your castaways</p>
                </div>
              </Link>
            </div>

            {/* Next Episode Countdown */}
            {nextEpisode && (
              <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-5 text-white shadow-elevated">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-burgundy-200" />
                    <div>
                      <p className="text-burgundy-100 text-sm">Next Episode</p>
                      <p className="font-semibold text-lg">Episode {nextEpisode.number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-burgundy-100 text-sm">Airs</p>
                    <p className="font-semibold">
                      {new Date(nextEpisode.air_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 Preview */}
            <div className="bg-white rounded-2xl shadow-card p-5 border border-cream-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-burgundy-500" />
                  Top Performers
                </h2>
                <button
                  onClick={() => setActiveTab('standings')}
                  className="text-burgundy-500 hover:text-burgundy-600 text-sm flex items-center gap-1"
                >
                  Full Standings <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {members?.slice(0, 3).map((member: any, index: number) => {
                  const rankStyle = getRankStyle(index + 1);
                  const isYou = member.user_id === user?.id;

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isYou
                          ? 'bg-burgundy-50 border border-burgundy-200'
                          : `${rankStyle.bg} border border-transparent`
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${rankStyle.bg}`}
                      >
                        {rankStyle.icon || (
                          <span className={`font-bold ${rankStyle.text}`}>{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-800">
                          {member.users?.display_name}
                          {isYou && <span className="ml-2 text-xs text-burgundy-500">(You)</span>}
                        </p>
                      </div>
                      <p className="font-bold text-neutral-800">{member.total_points || 0}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* League Chat */}
            {id && <LeagueChat leagueId={id} />}
          </div>
        )}

        {activeTab === 'players' && (
          <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
            <div className="p-5 border-b border-cream-100">
              <h2 className="text-lg font-display font-bold text-neutral-800">
                League Players ({members?.length || 0})
              </h2>
            </div>

            <div className="divide-y divide-cream-100">
              {members?.map((member: any, index: number) => {
                const playerRosters = rostersByUser?.[member.user_id];
                const isYou = member.user_id === user?.id;

                return (
                  <div
                    key={member.id}
                    className={`p-4 ${isYou ? 'bg-burgundy-50' : 'hover:bg-cream-50'} transition-colors`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center">
                        <span className="font-bold text-neutral-600">{index + 1}</span>
                      </div>

                      {/* Player Info */}
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-800">
                          {member.users?.display_name}
                          {isYou && <span className="ml-2 text-xs text-burgundy-500">(You)</span>}
                          {member.user_id === league.commissioner_id && (
                            <span className="ml-2 text-xs bg-burgundy-100 text-burgundy-600 px-2 py-0.5 rounded-full">
                              Creator
                            </span>
                          )}
                        </p>

                        {/* Castaways */}
                        <div className="flex items-center gap-2 mt-2">
                          {playerRosters?.castaways?.map((castaway: any) => (
                            <div
                              key={castaway.id}
                              className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs ${
                                castaway.status === 'eliminated'
                                  ? 'bg-neutral-100 text-neutral-500'
                                  : 'bg-cream-100 text-neutral-700'
                              }`}
                            >
                              <Flame
                                className={`h-3 w-3 ${
                                  castaway.status === 'eliminated'
                                    ? 'text-neutral-400'
                                    : 'text-orange-500'
                                }`}
                              />
                              {castaway.name}
                            </div>
                          )) || (
                            <span className="text-neutral-400 text-xs">No castaways drafted</span>
                          )}
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <p className="text-xl font-bold text-neutral-800">
                          {member.total_points || 0}
                        </p>
                        <p className="text-xs text-neutral-400">points</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="space-y-6">
            {/* Top 3 Podium */}
            {members && members.length >= 3 && (
              <div className="grid grid-cols-3 gap-4">
                {/* Second Place */}
                <div className="bg-gradient-to-b from-gray-100 to-gray-50 rounded-2xl p-5 border-2 border-gray-200 text-center mt-6">
                  <div className="w-10 h-10 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <Medal className="h-5 w-5 text-gray-500" />
                  </div>
                  <p className="font-semibold text-neutral-800 truncate text-sm">
                    {members[1].users?.display_name}
                  </p>
                  <p className="text-2xl font-display text-gray-600 mt-1">
                    {members[1].total_points || 0}
                  </p>
                  <p className="text-xs text-neutral-400">pts</p>
                </div>

                {/* First Place */}
                <div className="bg-gradient-to-b from-yellow-100 to-amber-50 rounded-2xl p-5 border-2 border-yellow-300 text-center shadow-elevated">
                  <div className="w-12 h-12 bg-yellow-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-yellow-700" />
                  </div>
                  <p className="font-bold text-neutral-800 truncate">
                    {members[0].users?.display_name}
                  </p>
                  <p className="text-3xl font-display text-yellow-700 mt-1">
                    {members[0].total_points || 0}
                  </p>
                  <p className="text-xs text-neutral-500">pts</p>
                </div>

                {/* Third Place */}
                <div className="bg-gradient-to-b from-orange-100 to-amber-50 rounded-2xl p-5 border-2 border-orange-200 text-center mt-6">
                  <div className="w-10 h-10 bg-orange-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <Medal className="h-5 w-5 text-orange-500" />
                  </div>
                  <p className="font-semibold text-neutral-800 truncate text-sm">
                    {members[2].users?.display_name}
                  </p>
                  <p className="text-2xl font-display text-orange-600 mt-1">
                    {members[2].total_points || 0}
                  </p>
                  <p className="text-xs text-neutral-400">pts</p>
                </div>
              </div>
            )}

            {/* Full Standings Table */}
            <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
              <div className="p-5 border-b border-cream-100">
                <h2 className="text-lg font-display font-bold text-neutral-800">Full Standings</h2>
              </div>

              <div className="divide-y divide-cream-100">
                {members?.map((member: any, index: number) => {
                  const rankStyle = getRankStyle(index + 1);
                  const isYou = member.user_id === user?.id;

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-4 p-4 transition-colors ${
                        isYou
                          ? 'bg-burgundy-50 border-l-4 border-burgundy-500'
                          : 'hover:bg-cream-50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${rankStyle.bg}`}
                      >
                        {rankStyle.icon || (
                          <span className={`font-bold ${rankStyle.text}`}>{index + 1}</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <p
                          className={`font-semibold ${isYou ? 'text-burgundy-700' : 'text-neutral-800'}`}
                        >
                          {member.users?.display_name}
                          {isYou && (
                            <span className="ml-2 text-xs text-burgundy-500 font-normal">
                              (You)
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-display text-neutral-800">
                          {member.total_points || 0}
                        </p>
                        <p className="text-xs text-neutral-400">points</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Invite Card - League creator sees full code, others just get share link */}
        {canManageLeague ? (
          <div className="mt-6 bg-white rounded-2xl shadow-card p-5 border border-cream-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-500 text-sm">League Invite Code</p>
                <p className="font-mono text-2xl font-bold text-burgundy-600 tracking-wider">
                  {league.code}
                </p>
              </div>
              <button
                onClick={copyInviteCode}
                className="btn btn-secondary flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copy Invite Link
                  </>
                )}
              </button>
            </div>
            <p className="text-neutral-400 text-xs mt-2">
              Share this link: {window.location.origin}/join/{league.code}
            </p>
          </div>
        ) : (
          <div className="mt-6 bg-white rounded-2xl shadow-card p-5 border border-cream-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-500 text-sm">Invite Friends</p>
                <p className="text-neutral-700 font-medium">
                  Share the invite link to grow your league!
                </p>
              </div>
              <button onClick={copyInviteCode} className="btn btn-primary flex items-center gap-2">
                {copied ? (
                  <>
                    <Check className="h-5 w-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="h-5 w-5" />
                    Share Link
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
