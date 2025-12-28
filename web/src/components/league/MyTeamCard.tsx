/**
 * My Team Card Component
 *
 * Shows the current user's roster in a league.
 */

import { Link } from 'react-router-dom';
import { Target, Users, ChevronRight, Flame } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import type { Roster, League } from '@/types';

interface MyTeamCardProps {
  leagueId: string;
  roster: Roster[] | undefined;
  league: League;
}

export function MyTeamCard({ leagueId, roster, league }: MyTeamCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 border border-cream-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
          <Target className="h-5 w-5 text-burgundy-500" />
          My Team
        </h2>
        <Link
          to={`/leagues/${leagueId}/team`}
          className="text-burgundy-500 hover:text-burgundy-600 text-sm flex items-center gap-1"
        >
          View Details <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {roster && roster.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {roster.map((rosterItem) => (
            <div
              key={rosterItem.id}
              className={`relative rounded-xl overflow-hidden ${
                rosterItem.castaways?.status === 'eliminated' ? 'opacity-60' : ''
              }`}
            >
              <div
                className={`p-4 ${
                  rosterItem.castaways?.status === 'eliminated'
                    ? 'bg-neutral-100 border border-neutral-200'
                    : 'bg-gradient-to-br from-cream-50 to-cream-100 border border-cream-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getAvatarUrl(
                      rosterItem.castaways?.name || 'Unknown',
                      rosterItem.castaways?.photo_url
                    )}
                    alt={rosterItem.castaways?.name || 'Castaway'}
                    className={`w-12 h-12 rounded-full object-cover border-2 ${
                      rosterItem.castaways?.status === 'eliminated'
                        ? 'border-neutral-300 grayscale'
                        : 'border-burgundy-200'
                    }`}
                  />
                  <div>
                    <p className="font-semibold text-neutral-800">{rosterItem.castaways?.name}</p>
                    <div className="flex items-center gap-1">
                      <Flame
                        className={`h-3 w-3 ${
                          rosterItem.castaways?.status === 'eliminated'
                            ? 'text-neutral-400'
                            : 'text-orange-500'
                        }`}
                      />
                      <span
                        className={`text-xs capitalize ${
                          rosterItem.castaways?.status === 'eliminated'
                            ? 'text-neutral-500'
                            : 'text-green-600'
                        }`}
                      >
                        {rosterItem.castaways?.status}
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
              to={`/leagues/${leagueId}/draft`}
              className="text-burgundy-500 hover:text-burgundy-600 text-sm mt-2 inline-block"
            >
              Submit Draft Rankings →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
