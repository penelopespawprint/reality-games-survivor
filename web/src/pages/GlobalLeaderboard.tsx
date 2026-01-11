import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';
import { Trophy, Users, TrendingUp, Medal, ChevronDown } from 'lucide-react';
import { GlobalChat } from '@/components/GlobalChat';
import { TorchStaff } from '@/components/icons';

interface PlayerStats {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  leagueCount: number;
  averagePoints: number;
  weightedScore: number;
  confidence: number;
  confidenceIndicator: string;
  scores: number[];
  hasEliminatedCastaway: boolean;
}

interface LeaderboardResponse {
  leaderboard: PlayerStats[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalPlayers: number;
    topScore: number;
    activeTorches: number;
  };
  activeSeason: {
    id: string;
    number: number;
    name: string;
  } | null;
}

const PAGE_SIZE = 50;

export default function GlobalLeaderboard() {
  const { user } = useAuth();
  const { getCopy } = useSiteCopy();
  const [offset, setOffset] = useState(0);

  // Fetch leaderboard from API with pagination
  const { data, isLoading, isFetching } = useQuery<LeaderboardResponse>({
    queryKey: ['global-leaderboard', offset],
    queryFn: async () => {
      const response = await fetch(
        `/api/leagues/global-leaderboard?limit=${PAGE_SIZE}&offset=${offset}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      return response.json();
    },
    placeholderData: (previousData) => previousData,
  });

  const leaderboard = data?.leaderboard;
  const activeSeason = data?.activeSeason;
  const summary = data?.summary;
  const pagination = data?.pagination;

  // Torch icon component with lit/unlit states - using the new TorchStaff
  const TorchIcon = ({ lit, size = 'normal' }: { lit: boolean; size?: 'normal' | 'large' }) => {
    const torchSize = size === 'large' ? 'lg' : 'md';
    return <TorchStaff lit={lit} size={torchSize} />;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1)
      return {
        bg: 'bg-gradient-to-r from-yellow-100 to-amber-50',
        border: 'border-yellow-300',
        text: 'text-yellow-700',
        icon: <Medal className="h-6 w-6 text-yellow-500" />,
      };
    if (rank === 2)
      return {
        bg: 'bg-gradient-to-r from-gray-100 to-slate-50',
        border: 'border-gray-300',
        text: 'text-gray-600',
        icon: <Medal className="h-6 w-6 text-gray-400" />,
      };
    if (rank === 3)
      return {
        bg: 'bg-gradient-to-r from-orange-100 to-amber-50',
        border: 'border-orange-300',
        text: 'text-orange-700',
        icon: <Medal className="h-6 w-6 text-orange-400" />,
      };
    return {
      bg: 'bg-white',
      border: 'border-cream-200',
      text: 'text-neutral-600',
      icon: null,
    };
  };

  const seasonTitle = activeSeason
    ? activeSeason.number === 50
      ? 'Survivor Season 50: In the Hands of the Fans'
      : `Season ${activeSeason.number}: ${activeSeason.name}`
    : getCopy('leaderboard.header.title', 'Global Leaderboard');

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-burgundy-500" />
          <h1 className="text-3xl font-display font-bold text-neutral-800">{seasonTitle}</h1>
        </div>
        <p className="text-neutral-500">
          {getCopy('leaderboard.header.subtitle', 'See where you rank among all players')}
        </p>
      </div>

      {/* Weighted Score Explanation Callout */}
      <div className="mb-6 bg-burgundy-50 border border-burgundy-100 rounded-xl px-4 py-3 text-sm text-burgundy-700">
        <span className="font-medium">Ranked by weighted score:</span> Players in more leagues get
        more accurate rankings. Confidence: ⚠️ = 1 league (33%), ✓ = 2 (55%), ✓✓ = 3 (70%), ✓✓✓ = 5+ (~83%+)
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 text-center">
          <Users className="h-6 w-6 text-burgundy-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-neutral-800">{summary?.totalPlayers || 0}</p>
          <p className="text-neutral-500 text-sm">Total Players</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 text-center">
          <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-neutral-800">{summary?.topScore || 0}</p>
          <p className="text-neutral-500 text-sm">Top Score</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 border border-cream-200 text-center">
          <div className="flex justify-center mb-2">
            <TorchStaff lit={true} size="lg" />
          </div>
          <p className="text-2xl font-bold text-neutral-800">{summary?.activeTorches || 0}</p>
          <p className="text-neutral-500 text-sm">Torches Lit</p>
        </div>
      </div>

      {/* Top 3 Podium - Only show on first page */}
      {offset === 0 && leaderboard && leaderboard.length >= 3 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-700 mb-4">Top Players</h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Second Place */}
            <div className="bg-gradient-to-b from-gray-100 to-gray-50 rounded-2xl p-6 border-2 border-gray-200 text-center mt-8">
              <div className="flex justify-center mb-3">
                <TorchIcon lit={!leaderboard[1].hasEliminatedCastaway} size="large" />
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-gray-600 font-bold text-lg">2</span>
              </div>
              <p className="font-semibold text-neutral-800 truncate">
                {leaderboard[1].displayName}
              </p>
              <p className="text-2xl font-display text-gray-600 mt-1">
                {leaderboard[1].weightedScore}
              </p>
              <p className="text-xs text-neutral-400">
                {leaderboard[1].leagueCount}{' '}
                {leaderboard[1].leagueCount === 1 ? 'league' : 'leagues'}{' '}
                {leaderboard[1].confidenceIndicator}
              </p>
            </div>

            {/* First Place */}
            <div className="bg-gradient-to-b from-yellow-100 to-amber-50 rounded-2xl p-6 border-2 border-yellow-300 text-center shadow-elevated">
              <div className="flex justify-center mb-3">
                <TorchIcon lit={!leaderboard[0].hasEliminatedCastaway} size="large" />
              </div>
              <div className="w-14 h-14 bg-yellow-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-yellow-700" />
              </div>
              <p className="font-bold text-neutral-800 truncate">{leaderboard[0].displayName}</p>
              <p className="text-3xl font-display text-yellow-700 mt-1">
                {leaderboard[0].weightedScore}
              </p>
              <p className="text-xs text-neutral-500">
                {leaderboard[0].leagueCount}{' '}
                {leaderboard[0].leagueCount === 1 ? 'league' : 'leagues'}{' '}
                {leaderboard[0].confidenceIndicator}
              </p>
            </div>

            {/* Third Place */}
            <div className="bg-gradient-to-b from-orange-100 to-amber-50 rounded-2xl p-6 border-2 border-orange-200 text-center mt-8">
              <div className="flex justify-center mb-3">
                <TorchIcon lit={!leaderboard[2].hasEliminatedCastaway} size="large" />
              </div>
              <div className="w-12 h-12 bg-orange-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-orange-600 font-bold text-lg">3</span>
              </div>
              <p className="font-semibold text-neutral-800 truncate">
                {leaderboard[2].displayName}
              </p>
              <p className="text-2xl font-display text-orange-600 mt-1">
                {leaderboard[2].weightedScore}
              </p>
              <p className="text-xs text-neutral-400">
                {leaderboard[2].leagueCount}{' '}
                {leaderboard[2].leagueCount === 1 ? 'league' : 'leagues'}{' '}
                {leaderboard[2].confidenceIndicator}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full Rankings */}
      <div className="bg-white rounded-2xl shadow-elevated overflow-hidden border border-cream-200">
        <div className="p-5 border-b border-cream-100">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-neutral-800">All Players</h2>
            </div>

            {/* Legend - aligned properly */}
            <div className="flex items-center gap-4 text-sm text-neutral-500 bg-cream-50 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-1.5">
                <TorchIcon lit={true} />
                <span>Active</span>
              </div>
              <div className="w-px h-4 bg-neutral-300" />
              <div className="flex items-center gap-1.5">
                <TorchIcon lit={false} />
                <span>Eliminated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Global Chat */}
        <div className="p-5 border-b border-cream-100">
          <GlobalChat />
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-burgundy-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-neutral-500 mt-4">Loading rankings...</p>
          </div>
        ) : leaderboard?.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">No players yet. Join a league to get started!</p>
            <Link to="/leagues" className="btn btn-primary mt-4 inline-block">
              Browse Leagues
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-cream-100">
            {leaderboard?.map((player, index) => {
              const rank = offset + index + 1;
              const rankStyle = getRankStyle(rank);
              const isCurrentUser = player.userId === user?.id;

              return (
                <div
                  key={player.userId}
                  className={`flex items-center gap-4 p-4 transition-colors ${
                    isCurrentUser
                      ? 'bg-burgundy-50 border-l-4 border-burgundy-500'
                      : rank <= 3
                        ? rankStyle.bg
                        : 'hover:bg-cream-50'
                  }`}
                >
                  {/* Rank */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      rank <= 3 ? '' : 'bg-cream-100'
                    } ${rankStyle.text}`}
                  >
                    {rankStyle.icon || rank}
                  </div>

                  {/* Torch */}
                  <div className="flex-shrink-0">
                    <TorchIcon lit={!player.hasEliminatedCastaway} />
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold truncate ${isCurrentUser ? 'text-burgundy-700' : 'text-neutral-800'}`}
                    >
                      {player.displayName}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-burgundy-500 font-normal">(You)</span>
                      )}
                    </p>
                    <p className="text-sm text-neutral-400">
                      {player.leagueCount} {player.leagueCount === 1 ? 'league' : 'leagues'} ·{' '}
                      {player.totalPoints} total pts ·{' '}
                      <span title={`Confidence: ${Math.round((player.confidence || 0.5) * 100)}%`}>
                        {player.confidenceIndicator || '⚠️'}
                      </span>
                    </p>
                  </div>

                  {/* Weighted Score */}
                  <div className="text-right">
                    <p
                      className={`text-2xl font-display ${rank <= 3 ? rankStyle.text : 'text-neutral-800'}`}
                    >
                      {player.weightedScore}
                    </p>
                    <p className="text-xs text-neutral-400">
                      avg: {player.averagePoints?.toFixed(1) || '0'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <p className="text-sm text-neutral-500">
            Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, pagination.total)} of{' '}
            {pagination.total} players
          </p>
          <div className="flex gap-3">
            {offset > 0 && (
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={isFetching}
                className="btn btn-secondary"
              >
                Previous
              </button>
            )}
            {pagination.hasMore && (
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={isFetching}
                className="btn btn-primary flex items-center gap-2"
              >
                {isFetching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load More
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Your Position Card - show if user is on current page but not in visible top 10 */}
      {user &&
        leaderboard &&
        leaderboard.length > 0 &&
        (() => {
          const userIndex = leaderboard.findIndex((p) => p.userId === user.id);
          if (userIndex === -1) return null;
          const globalRank = offset + userIndex + 1;
          if (globalRank <= 10) return null;

          const userStats = leaderboard[userIndex];
          return (
            <div className="mt-6 bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-6 text-white shadow-elevated">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="font-bold text-xl">#{globalRank}</span>
                  </div>
                  <div>
                    <p className="text-burgundy-100 text-sm">Your Position</p>
                    <p className="text-xl font-semibold">{userStats.displayName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-display">{userStats.weightedScore}</p>
                  <p className="text-burgundy-100 text-sm">score</p>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
