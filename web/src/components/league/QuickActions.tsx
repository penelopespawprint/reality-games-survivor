/**
 * Quick Actions Component
 *
 * Action buttons for weekly pick and draft rankings.
 */

import { Link } from 'react-router-dom';
import { Target, Users } from 'lucide-react';

interface QuickActionsProps {
  leagueId: string;
}

export function QuickActions({ leagueId }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Link
        to={`/leagues/${leagueId}/pick`}
        className="bg-burgundy-500 hover:bg-burgundy-600 text-white rounded-2xl p-5 shadow-elevated transition-all flex items-center gap-4"
      >
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Target className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">Make Pick</p>
          <p className="text-burgundy-200 text-sm">Choose this week's castaway</p>
        </div>
      </Link>
      <Link
        to={`/leagues/${leagueId}/draft`}
        className="bg-white hover:bg-cream-50 text-neutral-800 rounded-2xl p-5 shadow-card border border-cream-200 transition-all flex items-center gap-4"
      >
        <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center">
          <Users className="h-6 w-6 text-burgundy-500" />
        </div>
        <div>
          <p className="font-semibold">Draft Rankings</p>
          <p className="text-neutral-500 text-sm">Rank your castaways</p>
        </div>
      </Link>
    </div>
  );
}
