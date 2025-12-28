/**
 * Stats Row Component
 *
 * Displays key user statistics in a row of cards.
 */

import { Users, Flame, Zap } from 'lucide-react';

interface StatsRowProps {
  leagueCount: number;
  activeCastaways: number;
  totalPoints: number;
}

export function StatsRow({ leagueCount, activeCastaways, totalPoints }: StatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
        <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Users className="h-6 w-6 text-burgundy-500" />
        </div>
        <p className="text-3xl font-display font-bold text-neutral-800">{leagueCount}</p>
        <p className="text-sm text-neutral-500 mt-1">My Leagues</p>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Flame className="h-6 w-6 text-orange-500" />
        </div>
        <p className="text-3xl font-display font-bold text-neutral-800">{activeCastaways}</p>
        <p className="text-sm text-neutral-500 mt-1">Active Castaways</p>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-cream-200 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Zap className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-3xl font-display font-bold text-neutral-800">{totalPoints}</p>
        <p className="text-sm text-neutral-500 mt-1">Total Points</p>
      </div>
    </div>
  );
}
