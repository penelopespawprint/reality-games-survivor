/**
 * Top Performers Card Component
 *
 * Shows top 3 players in the league standings.
 */

import { Trophy, ChevronRight, Crown, Medal } from 'lucide-react';
import type { LeagueMember } from '@/types';

interface TopPerformersCardProps {
  members: LeagueMember[] | undefined;
  currentUserId: string | undefined;
  onViewFullStandings: () => void;
}

function getRankStyle(rank: number) {
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
}

export function TopPerformersCard({
  members,
  currentUserId,
  onViewFullStandings,
}: TopPerformersCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 border border-cream-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-burgundy-500" />
          Top Performers
        </h2>
        <button
          onClick={onViewFullStandings}
          className="text-burgundy-500 hover:text-burgundy-600 text-sm flex items-center gap-1"
        >
          Full Standings <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {members?.slice(0, 3).map((member, index) => {
          const rankStyle = getRankStyle(index + 1);
          const isYou = member.user_id === currentUserId;

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
                  {(member as any).users?.display_name}
                  {isYou && <span className="ml-2 text-xs text-burgundy-500">(You)</span>}
                </p>
              </div>
              <p className="font-bold text-neutral-800">{member.total_points || 0}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
