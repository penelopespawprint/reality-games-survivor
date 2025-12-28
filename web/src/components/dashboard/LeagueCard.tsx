/**
 * League Card Component
 *
 * Displays a single league with roster and rank info.
 */

import { Link } from 'react-router-dom';
import { getAvatarUrl } from '@/lib/avatar';

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

interface LeagueCardProps {
  leagueId: string;
  leagueName: string;
  leagueCode: string;
  totalPoints: number;
  rank: number | null;
  rosters: RosterEntry[];
}

export function LeagueCard({
  leagueId,
  leagueName,
  leagueCode,
  totalPoints,
  rank,
  rosters,
}: LeagueCardProps) {
  return (
    <Link
      to={`/leagues/${leagueId}`}
      className="block bg-white rounded-2xl hover:bg-cream-50 transition-colors border border-cream-200 overflow-hidden group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg text-neutral-800 group-hover:text-burgundy-600 transition-colors">
              {leagueName}
            </h3>
            <p className="text-sm text-neutral-400 font-mono">{leagueCode}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-display text-burgundy-500">{totalPoints}</p>
            <p className="text-xs text-neutral-400">points</p>
          </div>
        </div>

        {/* Castaways */}
        <div className="flex gap-3">
          {rosters.length > 0 ? (
            rosters.map((roster) => (
              <div
                key={roster.castaway_id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl flex-1 ${
                  roster.castaway?.status === 'eliminated' ? 'bg-neutral-100 opacity-60' : 'bg-cream-50'
                }`}
              >
                <img
                  src={getAvatarUrl(roster.castaway?.name || 'Unknown', roster.castaway?.photo_url)}
                  alt={roster.castaway?.name || 'Castaway'}
                  className={`w-10 h-10 rounded-full object-cover ${
                    roster.castaway?.status === 'eliminated' ? 'grayscale' : ''
                  }`}
                />
                <div>
                  <p
                    className={`font-medium text-sm ${
                      roster.castaway?.status === 'eliminated'
                        ? 'text-neutral-500 line-through'
                        : 'text-neutral-800'
                    }`}
                  >
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
        {rank && (
          <div className="mt-4 pt-4 border-t border-cream-100 flex items-center justify-between">
            <span className="text-sm text-neutral-500">Your Rank</span>
            <span className="font-semibold text-burgundy-500">#{rank}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
