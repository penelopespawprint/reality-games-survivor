/**
 * Castaway Card Component
 *
 * Card displaying a castaway with edit/action buttons.
 */

import { Trophy, History } from 'lucide-react';

interface Castaway {
  id: string;
  name: string;
  occupation: string | null;
  photo_url: string | null;
  status: 'active' | 'eliminated' | 'winner';
  placement: number | null;
  previous_seasons: string[] | null;
  best_placement: number | null;
}

interface CastawayCardProps {
  castaway: Castaway;
  isEliminated?: boolean;
  onEdit: () => void;
  onEliminate?: () => void;
  onReactivate?: () => void;
  isReactivating?: boolean;
}

export function CastawayCard({
  castaway,
  isEliminated = false,
  onEdit,
  onEliminate,
  onReactivate,
  isReactivating = false,
}: CastawayCardProps) {
  const hasWonBefore = castaway.best_placement === 1;

  const cardClass = isEliminated
    ? 'bg-neutral-50 rounded-xl p-4 flex items-center gap-4 opacity-75'
    : `rounded-xl p-4 flex items-center gap-4 ${hasWonBefore ? 'bg-yellow-50 border border-yellow-200' : 'bg-cream-50'}`;

  const photoClass = isEliminated
    ? 'relative w-14 h-14 bg-neutral-200 rounded-xl flex items-center justify-center overflow-hidden grayscale'
    : 'relative w-14 h-14 bg-cream-200 rounded-xl flex items-center justify-center overflow-hidden';

  const nameClass = isEliminated
    ? 'font-semibold text-neutral-600 truncate'
    : 'font-semibold text-neutral-800 truncate';

  const subTextClass = isEliminated ? 'text-sm text-neutral-400' : 'text-sm text-neutral-500';

  return (
    <div className={cardClass}>
      <div className={photoClass}>
        {castaway.photo_url ? (
          <img src={castaway.photo_url} alt={castaway.name} className="w-14 h-14 object-cover" />
        ) : (
          <span className="text-xl font-bold text-neutral-400">{castaway.name.charAt(0)}</span>
        )}
        {hasWonBefore && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
            <Trophy className="h-3 w-3 text-yellow-900" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={nameClass}>{castaway.name}</p>
          {castaway.previous_seasons && castaway.previous_seasons.length > 0 && (
            <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              <History className="h-3 w-3" />
              {castaway.previous_seasons.length}x
            </span>
          )}
        </div>
        <p className={subTextClass}>
          {isEliminated
            ? castaway.placement
              ? `#${castaway.placement}`
              : 'Eliminated'
            : castaway.occupation || 'No occupation'}
        </p>
        {!isEliminated && !castaway.photo_url && (
          <p className="text-xs text-orange-500">Missing photo</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
        >
          Edit
        </button>
        {isEliminated ? (
          <button
            onClick={onReactivate}
            disabled={isReactivating}
            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
          >
            Reactivate
          </button>
        ) : (
          <button
            onClick={onEliminate}
            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Eliminate
          </button>
        )}
      </div>
    </div>
  );
}
