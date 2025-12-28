/**
 * Global Rank Card Component
 *
 * Displays the user's global ranking with link to leaderboard.
 */

import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

interface GlobalRankCardProps {
  rank: number;
  totalPoints: number;
}

export function GlobalRankCard({ rank, totalPoints }: GlobalRankCardProps) {
  return (
    <Link
      to="/leaderboard"
      className="block bg-white hover:bg-cream-50 rounded-2xl p-6 border border-cream-200 mb-8 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-500 transition-colors">
            <TrendingUp className="h-7 w-7 text-amber-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-neutral-800">Your Global Rank</h3>
            <p className="text-neutral-500 text-sm">{totalPoints} points earned this season</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-display font-bold text-burgundy-500">#{rank}</p>
          <p className="text-xs text-neutral-400 mt-1">out of all players</p>
        </div>
      </div>
    </Link>
  );
}
