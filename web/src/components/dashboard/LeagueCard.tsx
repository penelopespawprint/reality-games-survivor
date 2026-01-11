/**
 * League Card Component
 *
 * Displays a single league with roster and rank info.
 */

import { Link } from 'react-router-dom';
import { getAvatarUrl } from '@/lib/avatar';
import { InlineWeeklyPick } from './InlineWeeklyPick';
import { Star } from 'lucide-react';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

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

interface CastawayPoints {
  castaway_id: string;
  total_points: number;
}

interface LeagueCardProps {
  leagueId: string;
  leagueName: string;
  leagueCode: string;
  totalPoints: number;
  rank: number | null;
  rosters: RosterEntry[];
  seasonId?: string;
  showWeeklyPick?: boolean;
  castawayPoints?: CastawayPoints[];
}

export function LeagueCard({
  leagueId,
  leagueName,
  leagueCode,
  totalPoints,
  rank,
  rosters,
  seasonId,
  showWeeklyPick = false,
  castawayPoints = [],
}: LeagueCardProps) {
  const { getCopy } = useSiteCopy();

  const getPointsForCastaway = (castawayId: string): number => {
    const found = castawayPoints.find((cp) => cp.castaway_id === castawayId);
    return found?.total_points || 0;
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
      <Link to={`/leagues/${leagueId}`} className="block hover:bg-cream-50 transition-colors group">
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
              <EditableText copyKey="dashboard.league.points_label" as="p" className="text-xs text-neutral-400">
                {getCopy('dashboard.league.points_label', 'points')}
              </EditableText>
            </div>
          </div>

          {/* Castaways */}
          <div className="flex gap-3">
            {rosters.length > 0 ? (
              rosters.map((roster) => {
                const points = getPointsForCastaway(roster.castaway_id);
                return (
                  <div
                    key={roster.castaway_id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl flex-1 ${
                      roster.castaway?.status === 'eliminated'
                        ? 'bg-neutral-100 opacity-60'
                        : 'bg-cream-50'
                    }`}
                  >
                    <img
                      src={getAvatarUrl(
                        roster.castaway?.name || 'Unknown',
                        roster.castaway?.photo_url
                      )}
                      alt={roster.castaway?.name || 'Castaway'}
                      className={`w-10 h-10 rounded-full object-cover ${
                        roster.castaway?.status === 'eliminated' ? 'grayscale' : ''
                      }`}
                    />
                    <div className="flex-1">
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
                        {roster.castaway?.status === 'eliminated'
                          ? getCopy('dashboard.league.eliminated', 'Eliminated')
                          : getCopy('dashboard.league.active', 'Active')}
                      </p>
                    </div>
                    {/* Points display */}
                    {points > 0 && (
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                        <Star className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700">{points}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex-1 text-center py-4 bg-cream-50 rounded-xl">
                <EditableText copyKey="dashboard.league.no_castaways" as="p" className="text-sm text-neutral-400">
                  {getCopy('dashboard.league.no_castaways', 'No castaways drafted yet')}
                </EditableText>
              </div>
            )}
          </div>

          {/* Rank indicator */}
          {rank && (
            <div className="mt-4 pt-4 border-t border-cream-100 flex items-center justify-between">
              <EditableText copyKey="dashboard.league.your_rank" as="span" className="text-sm text-neutral-500">
                {getCopy('dashboard.league.your_rank', 'Your Rank')}
              </EditableText>
              <span className="font-semibold text-burgundy-500">#{rank}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Inline Weekly Pick */}
      {showWeeklyPick && seasonId && (
        <div className="px-6 pb-6">
          <InlineWeeklyPick leagueId={leagueId} leagueName={leagueName} seasonId={seasonId} />
        </div>
      )}
    </div>
  );
}
