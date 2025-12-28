/**
 * League Home Page
 *
 * Main hub for a single league showing overview, players, and standings.
 * Refactored from 770 lines to use extracted sub-components.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { LeagueChat } from '@/components/LeagueChat';
import { useAuth } from '@/lib/auth';
import {
  LeagueHeader,
  LeagueTabs,
  MyTeamCard,
  QuickActions,
  NextEpisodeCard,
  TopPerformersCard,
  PlayersTab,
  StandingsTab,
  InviteCard,
  type LeagueTab,
} from '@/components/league';
import {
  useLeague,
  useLeagueMembers,
  useLeagueRosters,
  useRoster,
  useUserProfile,
  useNextEpisode,
} from '@/lib/hooks';

export default function LeagueHome() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LeagueTab>('overview');
  const [copied, setCopied] = useState(false);

  // Data fetching with shared hooks
  const { data: league, isLoading: leagueLoading } = useLeague(id);
  const { data: members } = useLeagueMembers(id);
  const { data: allRosters } = useLeagueRosters(id);
  const { data: myRoster } = useRoster(id, user?.id);
  const { data: userProfile } = useUserProfile(user?.id);
  const { data: nextEpisode } = useNextEpisode(league?.season_id);

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
  const rostersByUser = allRosters?.reduce(
    (acc: Record<string, { user: any; castaways: any[] }>, roster: any) => {
      const userId = roster.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user: roster.users,
          castaways: [],
        };
      }
      acc[userId].castaways.push(roster.castaways);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
      <Navigation />

      <div className="max-w-4xl mx-auto p-4 pb-24">
        <LeagueHeader
          league={league}
          members={members}
          myMembership={myMembership}
          canManageLeague={canManageLeague}
          copied={copied}
          onCopyInvite={copyInviteCode}
        />

        <LeagueTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <MyTeamCard leagueId={id!} roster={myRoster} league={league} />
            <QuickActions leagueId={id!} />
            {nextEpisode && <NextEpisodeCard episode={nextEpisode} />}
            <TopPerformersCard
              members={members}
              currentUserId={user?.id}
              onViewFullStandings={() => setActiveTab('standings')}
            />
            {id && <LeagueChat leagueId={id} />}
          </div>
        )}

        {activeTab === 'players' && (
          <PlayersTab
            members={members}
            rostersByUser={rostersByUser}
            currentUserId={user?.id}
            commissionerId={league.commissioner_id}
          />
        )}

        {activeTab === 'standings' && (
          <StandingsTab members={members} currentUserId={user?.id} />
        )}

        <InviteCard
          league={league}
          canManageLeague={canManageLeague}
          copied={copied}
          onCopyInvite={copyInviteCode}
        />
      </div>
    </div>
  );
}
