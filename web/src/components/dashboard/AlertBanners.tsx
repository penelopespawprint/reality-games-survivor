/**
 * Alert Banners Component
 *
 * Displays elimination and auto-pick alerts on the dashboard.
 */

import { XCircle, AlertCircle } from 'lucide-react';

interface EliminatedCastaway {
  id: string;
  name: string;
}

interface AutoPickedLeague {
  league_id: string;
  leagues?: { name: string };
}

interface AlertBannersProps {
  recentlyEliminated?: EliminatedCastaway[];
  autoPickedLeagues?: AutoPickedLeague[];
}

export function AlertBanners({ recentlyEliminated, autoPickedLeagues }: AlertBannersProps) {
  const hasEliminated = recentlyEliminated && recentlyEliminated.length > 0;
  const hasAutoPicked = autoPickedLeagues && autoPickedLeagues.length > 0;

  if (!hasEliminated && !hasAutoPicked) return null;

  return (
    <div className="space-y-3 mb-6">
      {/* Eliminated Castaway Alert */}
      {hasEliminated && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800">
              {recentlyEliminated.length === 1
                ? `${recentlyEliminated[0].name} was eliminated!`
                : `${recentlyEliminated.map((c) => c.name).join(' and ')} were eliminated!`}
            </p>
            <p className="text-sm text-red-700 mt-1">
              {recentlyEliminated.length === 1
                ? 'The tribe has spoken. You still have your other castaway to play for!'
                : 'The tribe has spoken. Your season may be impacted by these eliminations.'}
            </p>
          </div>
        </div>
      )}

      {/* Auto-Pick Alert */}
      {hasAutoPicked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-800">
              You were auto-picked in{' '}
              {autoPickedLeagues.length === 1
                ? autoPickedLeagues[0].leagues?.name || 'a league'
                : `${autoPickedLeagues.length} leagues`}
            </p>
            <p className="text-sm text-amber-700 mt-1">
              You didn't submit a pick in time last episode. Make sure to pick before the deadline
              this week!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
