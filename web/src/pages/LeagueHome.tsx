/**
 * League Home Page
 *
 * Main hub for a single league showing overview, players, and standings.
 * Refactored from 770 lines to use extracted sub-components.
 */

import { useState, useEffect } from 'react';
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, AlertCircle, CheckCircle } from 'lucide-react';
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
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<LeagueTab>('overview');
  const [copied, setCopied] = useState(false);
  const [showJoinedSuccess, setShowJoinedSuccess] = useState(false);

  // Data fetching with shared hooks
  const { data: league, isLoading: leagueLoading, error: leagueError } = useLeague(id);
  const { data: members, isLoading: membersLoading } = useLeagueMembers(id);
  const { data: allRosters } = useLeagueRosters(id);
  const { data: myRoster } = useRoster(id, user?.id);
  const { data: userProfile } = useUserProfile(user?.id);
  const { data: nextEpisode } = useNextEpisode(league?.season_id);

  // Handle joined=true query parameter from Stripe redirect
  useEffect(() => {
    if (searchParams.get('joined') === 'true') {
      setShowJoinedSuccess(true);
      // Remove query parameter from URL
      searchParams.delete('joined');
      setSearchParams(searchParams, { replace: true });
      // Hide success message after 5 seconds
      const timer = setTimeout(() => setShowJoinedSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // Clipboard API with fallback for older browsers/HTTP
  const copyInviteCode = async () => {
    if (!league?.code) return;
    const url = `${window.location.origin}/join/${league.code}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for HTTP or older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Show the URL in an alert as last resort
      alert(`Copy this link: ${url}`);
    }
  };

  // Note: ProtectedRoute already handles auth redirects
  // This is kept as a safety net but should rarely execute
  if (!authLoading && !user) {
    // Check for magic link hash - don't redirect if processing auth
    if (!window.location.hash.includes('access_token')) {
      return <Navigate to={`/login?redirect=/leagues/${id}`} replace />;
    }
  }

  if (leagueLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
      </div>
    );
  }

  // Handle league fetch error
  if (leagueError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <div className="max-w-md mx-auto p-4 pt-16">
          <div className="bg-white rounded-2xl shadow-card p-8 text-center border border-red-200">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-800 mb-2">Error Loading League</h2>
            <p className="text-neutral-600 mb-4">
              {leagueError instanceof Error ? leagueError.message : 'Failed to load league data'}
            </p>
            <Link to="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <div className="max-w-md mx-auto p-4 pt-16">
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <AlertCircle className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-800 mb-2">League Not Found</h2>
            <p className="text-neutral-600 mb-4">
              This league may have been deleted or the link is incorrect.
            </p>
            <Link to="/dashboard" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const myMembership = members?.find((m) => m.user_id === user?.id);
  const isCommissioner = league?.commissioner_id === user?.id;
  const isAdmin = userProfile?.role === 'admin';
  const canManageLeague = isCommissioner || isAdmin;

  // Access control: Only members, commissioner, or admins can view private league data
  const isGlobalLeague = league?.is_global === true;
  const canViewLeague = isGlobalLeague || myMembership || isCommissioner || isAdmin;

  if (!canViewLeague && !membersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <div className="max-w-md mx-auto p-4 pt-16">
          <div className="bg-white rounded-2xl shadow-card p-8 text-center border border-amber-200">
            <Lock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-800 mb-2">Private League</h2>
            <p className="text-neutral-600 mb-4">
              You need to be a member of this league to view its contents.
            </p>
            {league.code && (
              <Link to={`/join/${league.code}`} className="btn btn-primary mb-3 inline-block">
                Join This League
              </Link>
            )}
            <div>
              <Link to="/dashboard" className="text-burgundy-500 hover:text-burgundy-600">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Security: Check if user has access to this league
  // - Public leagues: anyone can view
  // - Private leagues: only members, commissioner, or admins can view
  const isMember = !!myMembership;
  const hasAccess = league.is_public || isMember || isCommissioner || isAdmin;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200">
        <Navigation />
        <div className="max-w-md mx-auto p-4 pt-16">
          <div className="bg-white rounded-2xl shadow-card p-8 border border-cream-200 text-center">
            <div className="w-16 h-16 bg-burgundy-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-burgundy-500" />
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 mb-2">
              Private League
            </h1>
            <p className="text-neutral-500 mb-6">
              This is a private league. You need to be a member to view its content.
            </p>
            {league.password_hash ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-neutral-500 justify-center">
                  <AlertCircle className="h-4 w-4" />
                  <span>This league requires a password to join</span>
                </div>
                <Link to={`/join/${league.code}`} className="btn btn-primary w-full">
                  Join with Invite Code
                </Link>
              </div>
            ) : (
              <Link to={`/join/${league.code}`} className="btn btn-primary w-full">
                Request to Join
              </Link>
            )}
            <Link
              to="/dashboard"
              className="block mt-4 text-burgundy-500 hover:text-burgundy-600 text-sm"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
        {/* Success message after joining */}
        {showJoinedSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-slide-down">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-800">Successfully joined the league!</p>
              <p className="text-sm text-green-700">
                Your payment was processed and you're now a member.
              </p>
            </div>
            <button
              onClick={() => setShowJoinedSuccess(false)}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

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

        {activeTab === 'standings' && <StandingsTab members={members} currentUserId={user?.id} />}

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
