/**
 * Players Tab Component
 *
 * Shows all league members with their rosters.
 */

import { Flame } from 'lucide-react';
import type { LeagueMember } from '@/types';

interface RostersByUser {
  [userId: string]: {
    user: { id: string; display_name: string };
    castaways: { id: string; name: string; status: string }[];
  };
}

interface PlayersTabProps {
  members: LeagueMember[] | undefined;
  rostersByUser: RostersByUser | undefined;
  currentUserId: string | undefined;
  commissionerId: string;
}

export function PlayersTab({
  members,
  rostersByUser,
  currentUserId,
  commissionerId,
}: PlayersTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      <div className="p-5 border-b border-cream-100">
        <h2 className="text-lg font-display font-bold text-neutral-800">
          League Players ({members?.length || 0})
        </h2>
      </div>

      <div className="divide-y divide-cream-100">
        {members?.map((member, index) => {
          const playerRosters = rostersByUser?.[member.user_id];
          const isYou = member.user_id === currentUserId;

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
                    {(member as any).users?.display_name}
                    {isYou && <span className="ml-2 text-xs text-burgundy-500">(You)</span>}
                    {member.user_id === commissionerId && (
                      <span className="ml-2 text-xs bg-burgundy-100 text-burgundy-600 px-2 py-0.5 rounded-full">
                        Creator
                      </span>
                    )}
                  </p>

                  {/* Castaways */}
                  <div className="flex items-center gap-2 mt-2">
                    {playerRosters?.castaways?.map((castaway) => (
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
                    )) || <span className="text-neutral-400 text-xs">No castaways drafted</span>}
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className="text-xl font-bold text-neutral-800">{member.total_points || 0}</p>
                  <p className="text-xs text-neutral-400">points</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
