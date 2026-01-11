/**
 * Global Rank Card Component
 *
 * Displays the user's global ranking with link to leaderboard.
 */

import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { EditableText } from '@/components/EditableText';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';

interface GlobalRankCardProps {
  rank: number;
  totalPoints: number;
}

export function GlobalRankCard({ rank, totalPoints }: GlobalRankCardProps) {
  const { getCopy } = useSiteCopy();

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
            <EditableText copyKey="dashboard.rank.title" as="h3" className="font-bold text-lg text-neutral-800">
              {getCopy('dashboard.rank.title', 'Your Global Rank')}
            </EditableText>
            <p className="text-neutral-500 text-sm">
              {totalPoints}{' '}
              <EditableText copyKey="dashboard.rank.points_label" as="span" className="text-neutral-500 text-sm">
                {getCopy('dashboard.rank.points_label', 'points earned this season')}
              </EditableText>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-display font-bold text-burgundy-500">#{rank}</p>
          <EditableText copyKey="dashboard.rank.out_of" as="p" className="text-xs text-neutral-400 mt-1">
            {getCopy('dashboard.rank.out_of', 'out of all players')}
          </EditableText>
        </div>
      </div>
    </Link>
  );
}
