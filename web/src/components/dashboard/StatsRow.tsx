/**
 * Stats Row Component
 *
 * Displays key user statistics in a row of cards.
 */

import { Users, Flame, Zap } from 'lucide-react';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

interface StatsRowProps {
  leagueCount: number;
  activeCastaways: number;
  totalPoints: number;
}

export function StatsRow({ leagueCount, activeCastaways, totalPoints }: StatsRowProps) {
  const { getCopy } = useSiteCopy();

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
        <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Users className="h-6 w-6 text-burgundy-500" />
        </div>
        <p className="text-3xl font-display font-bold text-neutral-800">{leagueCount}</p>
        <EditableText copyKey="dashboard.stats.my_leagues" as="p" className="text-sm text-neutral-500 mt-1">
          {getCopy('dashboard.stats.my_leagues', 'My Leagues')}
        </EditableText>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Flame className="h-6 w-6 text-orange-500" />
        </div>
        <p className="text-3xl font-display font-bold text-neutral-800">{activeCastaways}</p>
        <EditableText copyKey="dashboard.stats.active_castaways" as="p" className="text-sm text-neutral-500 mt-1">
          {getCopy('dashboard.stats.active_castaways', 'Active Castaways')}
        </EditableText>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Zap className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-3xl font-display font-bold text-neutral-800">{totalPoints}</p>
        <EditableText copyKey="dashboard.stats.total_points" as="p" className="text-sm text-neutral-500 mt-1">
          {getCopy('dashboard.stats.total_points', 'Total Points')}
        </EditableText>
      </div>
    </div>
  );
}
