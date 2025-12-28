/**
 * Castaway Pick Card Component
 *
 * Displays a castaway option for selection in weekly picks.
 */

import { Trophy, Target, TrendingUp } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar';
import type { Castaway } from '@/types';

interface CastawayStats {
  castaway_id: string;
  total_points: number;
  times_picked: number;
  avg_points: number;
}

interface CastawayPickCardProps {
  castaway: Castaway;
  isSelected: boolean;
  stats?: CastawayStats;
  onSelect: () => void;
}

export function CastawayPickCard({
  castaway,
  isSelected,
  stats,
  onSelect,
}: CastawayPickCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-5 rounded-xl border-2 transition-all text-left flex items-center gap-5 ${
        isSelected
          ? 'border-burgundy-500 bg-burgundy-50 shadow-card'
          : 'border-cream-200 bg-cream-50 hover:border-cream-300 hover:shadow-sm'
      }`}
    >
      {/* Photo */}
      <img
        src={getAvatarUrl(castaway.name || 'Unknown', castaway.photo_url)}
        alt={castaway.name || 'Castaway'}
        className="w-16 h-16 rounded-xl object-cover"
      />

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h3
            className={`font-semibold text-lg ${
              isSelected ? 'text-burgundy-700' : 'text-neutral-800'
            }`}
          >
            {castaway.name}
          </h3>
          <span
            className={`badge text-xs ${
              castaway.status === 'active' ? 'badge-success' : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {castaway.status?.toUpperCase()}
          </span>
        </div>

        {/* Castaway Stats */}
        {stats && stats.times_picked > 0 ? (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-neutral-500">
              <Trophy className="w-3.5 h-3.5" />
              <span>{stats.total_points} pts total</span>
            </div>
            <div className="flex items-center gap-1 text-neutral-500">
              <Target className="w-3.5 h-3.5" />
              <span>{stats.times_picked}x picked</span>
            </div>
            <div className="flex items-center gap-1 text-neutral-500">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats.avg_points} avg</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Not yet picked this season</p>
        )}
      </div>

      {/* Selection indicator */}
      <div
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
          isSelected ? 'border-burgundy-500 bg-burgundy-500' : 'border-cream-300'
        }`}
      >
        {isSelected && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}
