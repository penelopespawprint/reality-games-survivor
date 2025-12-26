import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

const PLAYERS_PER_PAGE = 25;

interface LeagueMember {
  id: string;
  user_id: string;
  total_points: number;
  rank: number | null;
  previous_rank: number | null;
  users: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface League {
  id: string;
  name: string;
  code: string;
  season_id: string;
}

interface UserProfile {
  id: string;
  display_name: string;
}

export function Leaderboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: _profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data as League;
    },
    enabled: !!leagueId,
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ['leaderboard', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('league_members')
        .select('id, user_id, total_points, rank, previous_rank, users(id, display_name)')
        .eq('league_id', leagueId)
        .order('total_points', { ascending: false });
      if (error) throw error;
      return data as LeagueMember[];
    },
    enabled: !!leagueId,
  });

  const getMovement = (currentRank: number, previousRank: number | null) => {
    if (previousRank === null) return { type: 'new', change: 0 };
    const change = previousRank - currentRank; // Positive = moved up, negative = moved down
    if (change > 0) return { type: 'up', change };
    if (change < 0) return { type: 'down', change: Math.abs(change) };
    return { type: 'same', change: 0 };
  };

  const getRankDisplay = (index: number) => {
    if (index === 0) return { emoji: '🥇', bg: 'bg-yellow-100', text: 'text-yellow-700' };
    if (index === 1) return { emoji: '🥈', bg: 'bg-gray-100', text: 'text-gray-700' };
    if (index === 2) return { emoji: '🥉', bg: 'bg-orange-100', text: 'text-orange-700' };
    return { emoji: null, bg: 'bg-cream-50', text: 'text-neutral-600' };
  };

  // Pagination
  const totalMembers = members?.length || 0;
  const totalPages = Math.ceil(totalMembers / PLAYERS_PER_PAGE);
  const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE;
  const endIndex = startIndex + PLAYERS_PER_PAGE;
  const paginatedMembers = members?.slice(startIndex, endIndex) || [];
  const showPagination = totalPages > 1;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/dashboard"
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-display text-neutral-800">Leaderboard</h1>
          </div>
          <p className="text-neutral-500">{league?.name || 'Loading...'}</p>
        </div>

        <div className="text-right">
          <p className="text-sm text-neutral-500">League Code</p>
          <p className="font-mono font-bold text-burgundy-600">{league?.code}</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-2xl shadow-elevated overflow-hidden animate-slide-up">
        <div className="p-6 border-b border-cream-100">
          <h2 className="font-semibold text-neutral-800">Standings</h2>
          <p className="text-sm text-neutral-500 mt-1">{members?.length || 0} players</p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-burgundy-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-neutral-500 mt-4">Loading standings...</p>
          </div>
        ) : members?.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-neutral-500">No players in this league yet.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-cream-100">
              {paginatedMembers.map((member, index) => {
                const globalIndex = startIndex + index;
                const rankStyle = getRankDisplay(globalIndex);
                const isCurrentUser = member.user_id === user?.id;
                const currentRank = globalIndex + 1;
                const movement = getMovement(currentRank, member.previous_rank);

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-4 p-5 transition-colors ${
                      isCurrentUser ? 'bg-burgundy-50' : 'hover:bg-cream-50'
                    }`}
                  >
                    {/* Rank */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${rankStyle.bg} ${rankStyle.text}`}
                    >
                      {rankStyle.emoji || currentRank}
                    </div>

                    {/* Movement Indicator */}
                    <div className="w-8 flex justify-center">
                      {movement.type === 'up' && (
                        <div className="flex items-center gap-0.5 text-green-600">
                          <ArrowUp className="h-4 w-4" />
                          <span className="text-xs font-semibold">{movement.change}</span>
                        </div>
                      )}
                      {movement.type === 'down' && (
                        <div className="flex items-center gap-0.5 text-red-500">
                          <ArrowDown className="h-4 w-4" />
                          <span className="text-xs font-semibold">{movement.change}</span>
                        </div>
                      )}
                      {movement.type === 'same' && <Minus className="h-4 w-4 text-neutral-300" />}
                      {movement.type === 'new' && (
                        <span className="text-xs font-medium text-blue-500">NEW</span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1">
                      <p
                        className={`font-semibold ${isCurrentUser ? 'text-burgundy-700' : 'text-neutral-800'}`}
                      >
                        {member.users?.display_name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-burgundy-500">(You)</span>
                        )}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <p className="text-2xl font-display text-neutral-800">
                        {member.total_points}
                      </p>
                      <p className="text-xs text-neutral-400">points</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {showPagination && (
              <div className="p-4 border-t border-cream-100 flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalMembers)} of {totalMembers}{' '}
                  players
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-cream-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-50 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-neutral-600" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first, last, current, and adjacent pages
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1);
                      const showEllipsis =
                        (page === 2 && currentPage > 3) ||
                        (page === totalPages - 1 && currentPage < totalPages - 2);

                      if (!showPage && !showEllipsis) return null;
                      if (showEllipsis && !showPage) {
                        return (
                          <span key={page} className="px-2 text-neutral-400">
                            ...
                          </span>
                        );
                      }
                      if (!showPage) return null;

                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                            page === currentPage
                              ? 'bg-burgundy-500 text-white'
                              : 'border border-cream-200 text-neutral-600 hover:bg-cream-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-cream-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-50 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-neutral-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Your Position Card */}
      {user && members && (
        <div
          className="mt-6 bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-6 text-white shadow-elevated animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-burgundy-100 text-sm">Your Position</p>
              <p className="text-3xl font-display mt-1">
                #{members.findIndex((m) => m.user_id === user.id) + 1}
              </p>
            </div>
            <div className="text-right">
              <p className="text-burgundy-100 text-sm">Your Points</p>
              <p className="text-3xl font-display mt-1">
                {members.find((m) => m.user_id === user.id)?.total_points || 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
