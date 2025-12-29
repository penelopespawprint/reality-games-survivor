/**
 * Trivia Leaderboard Modal
 *
 * Shows the leaderboard when a user gets a question wrong OR completes all 24.
 * Displays top completers ranked by days to complete.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { X, Trophy, Clock, Medal, Flame, Sparkles, RotateCcw } from 'lucide-react';
import { apiWithAuth } from '@/lib/api';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  daysToComplete: number;
  attempts: number;
  completedAt: string;
  userId: string;
}

interface TriviaLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  currentUserId?: string;
  title: string;
  subtitle: string;
  isCompletion?: boolean;
}

export function TriviaLeaderboardModal({
  isOpen,
  onClose,
  accessToken,
  currentUserId,
  title,
  subtitle,
  isCompletion = false,
}: TriviaLeaderboardModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['trivia', 'leaderboard'],
    queryFn: async () => {
      const response = await apiWithAuth<{ leaderboard: LeaderboardEntry[] }>(
        '/trivia/leaderboard',
        accessToken
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: isOpen && !!accessToken,
  });

  if (!isOpen) return null;

  const leaderboard = data?.leaderboard || [];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-neutral-500 font-mono text-sm">{rank}</span>;
  };

  // Find current user's rank
  const userEntry = leaderboard.find((e) => e.userId === currentUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden ${
          isCompletion
            ? 'bg-gradient-to-b from-yellow-900/90 to-neutral-900 border border-yellow-500/30'
            : 'bg-gradient-to-b from-neutral-900 to-neutral-800 border border-orange-500/30'
        }`}
      >
        {/* Effect at top */}
        <div
          className={`absolute top-0 left-0 right-0 h-32 pointer-events-none ${
            isCompletion
              ? 'bg-gradient-to-b from-yellow-500/20 to-transparent'
              : 'bg-gradient-to-b from-orange-600/20 to-transparent'
          }`}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="relative px-6 pt-8 pb-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              {isCompletion ? (
                <>
                  <Trophy className="h-16 w-16 text-yellow-400" />
                  <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-yellow-300 animate-pulse" />
                  <div className="absolute inset-0 h-16 w-16 bg-yellow-500/30 blur-xl" />
                </>
              ) : (
                <>
                  <Flame className="h-16 w-16 text-orange-500 animate-pulse" />
                  <div className="absolute inset-0 h-16 w-16 bg-orange-500/30 blur-xl" />
                </>
              )}
            </div>
          </div>

          <h2
            className={`text-2xl font-display font-bold mb-2 ${
              isCompletion ? 'text-yellow-400' : 'text-orange-400'
            }`}
          >
            {title}
          </h2>
          <p className="text-neutral-400 text-sm">{subtitle}</p>

          {/* Show user's rank if they completed */}
          {isCompletion && userEntry && (
            <div className="mt-4 inline-flex items-center gap-2 bg-yellow-500/20 px-4 py-2 rounded-full border border-yellow-500/30">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-300 font-semibold">
                You ranked #{userEntry.rank} • {userEntry.daysToComplete}{' '}
                {userEntry.daysToComplete === 1 ? 'day' : 'days'} • {userEntry.attempts}{' '}
                {userEntry.attempts === 1 ? 'try' : 'tries'}
              </span>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-white">Trivia Champions</h3>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div
                className={`animate-spin h-8 w-8 border-2 border-t-transparent rounded-full ${
                  isCompletion ? 'border-yellow-500' : 'border-orange-500'
                }`}
              />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-400">No one has completed the trivia yet.</p>
              <p className="text-sm text-neutral-500 mt-2">
                Be the first to answer all 24 questions!
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {leaderboard.map((entry) => {
                const isCurrentUser = entry.userId === currentUserId;
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isCurrentUser
                        ? isCompletion
                          ? 'bg-yellow-500/20 border border-yellow-500/30'
                          : 'bg-orange-500/20 border border-orange-500/30'
                        : 'bg-neutral-700/50 hover:bg-neutral-700/70'
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          isCurrentUser
                            ? isCompletion
                              ? 'text-yellow-300'
                              : 'text-orange-300'
                            : 'text-white'
                        }`}
                      >
                        {entry.displayName}
                        {isCurrentUser && (
                          <span
                            className={`ml-2 text-xs ${isCompletion ? 'text-yellow-400' : 'text-orange-400'}`}
                          >
                            (You)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Stats: Days and Attempts */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1" title="Days to complete">
                        <Clock className="h-4 w-4 text-neutral-400" />
                        <span
                          className={
                            isCurrentUser
                              ? isCompletion
                                ? 'text-yellow-300'
                                : 'text-orange-300'
                              : 'text-neutral-300'
                          }
                        >
                          {entry.daysToComplete}d
                        </span>
                      </div>
                      <div className="flex items-center gap-1" title="Number of attempts">
                        <RotateCcw className="h-3.5 w-3.5 text-neutral-400" />
                        <span
                          className={
                            isCurrentUser
                              ? isCompletion
                                ? 'text-yellow-300'
                                : 'text-orange-300'
                              : 'text-neutral-300'
                          }
                        >
                          {entry.attempts}x
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-3">
          {isCompletion ? (
            <>
              <Link
                to="/dashboard"
                className="block w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg shadow-yellow-500/25 text-center"
              >
                Join a Fantasy League →
              </Link>
              <button
                onClick={onClose}
                className="w-full py-3 bg-neutral-700 text-neutral-300 font-medium rounded-xl hover:bg-neutral-600 transition-all"
              >
                Close
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl hover:from-orange-500 hover:to-red-500 transition-all shadow-lg shadow-orange-500/25"
            >
              Try Again Tomorrow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
