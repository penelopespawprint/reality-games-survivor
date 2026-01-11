import { Trophy, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAvatarUrl } from '@/lib/avatar';

// Minimal castaway interface for grid display
interface CastawayForGrid {
  id: string;
  name: string;
  occupation?: string | null;
  hometown?: string | null;
  status: 'active' | 'eliminated' | 'winner';
  tribe_original?: string | null;
  tribe_current?: string | null;
  photo_url?: string | null;
  age?: number | null;
  bio?: string | null;
  fun_fact?: string | null;
  previous_seasons?: string[] | null;
  best_placement?: number | null;
  placement?: number | null;
  episodes?: { number: number } | null;
}

interface CastawayGridItemProps {
  castaway: CastawayForGrid;
  stats: {
    total: number;
    byEpisode: Record<number, number>;
    episodeCount: number;
    trend: 'up' | 'down' | 'neutral';
  };
  isExpanded: boolean;
  onToggleExpand: (id: string | null) => void;
}

export function CastawayGridItem({ castaway, stats }: CastawayGridItemProps) {
  // Get tribe color for styling
  const getTribeStyles = (tribe: string | null | undefined) => {
    switch (tribe) {
      case 'Vatu':
        return { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-100' };
      case 'Kalo':
        return { bg: 'bg-teal-500', text: 'text-teal-600', light: 'bg-teal-100' };
      case 'Cila':
        return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-100' };
      default:
        return { bg: 'bg-neutral-500', text: 'text-neutral-600', light: 'bg-neutral-100' };
    }
  };

  const tribeStyles = getTribeStyles(castaway.tribe_original);

  return (
    <Link
      to={`/castaways/${castaway.id}`}
      className={`group block bg-white rounded-2xl border-2 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ${
        castaway.status === 'eliminated'
          ? 'border-neutral-200 opacity-70'
          : castaway.status === 'winner'
            ? 'border-amber-300 ring-2 ring-amber-100'
            : 'border-cream-200 hover:border-burgundy-200'
      }`}
    >
      {/* Large Portrait Photo */}
      <div
        className={`aspect-[3/4] relative overflow-hidden ${castaway.status === 'eliminated' ? 'grayscale' : ''}`}
      >
        <img
          src={getAvatarUrl(castaway.name, castaway.photo_url)}
          alt={castaway.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (castaway.photo_url && !target.src.includes('dicebear')) {
              target.src = getAvatarUrl(castaway.name, null);
            }
          }}
        />

        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Winner badge - Top Right (only shown for winners) */}
        {castaway.status === 'winner' && (
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
              <Trophy className="h-3 w-3" />
              WINNER
            </span>
          </div>
        )}

        {/* Eliminated badge - Top Right (only for eliminated) */}
        {castaway.status === 'eliminated' && (
          <div className="absolute top-3 right-3">
            <span className="bg-neutral-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
              OUT EP {castaway.episodes?.number || '?'}
            </span>
          </div>
        )}

        {/* Name overlay at bottom of photo */}
        <div className="absolute bottom-0 inset-x-0 p-3">
          <h3 className="font-display font-bold text-white text-lg leading-tight drop-shadow-lg">
            {castaway.name}
          </h3>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        {/* Occupation & Location */}
        <div className="space-y-1 mb-3">
          {castaway.occupation && (
            <p className="text-sm text-neutral-600 font-medium truncate">{castaway.occupation}</p>
          )}
          {castaway.hometown && (
            <p className="text-xs text-neutral-400 flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {castaway.hometown}
            </p>
          )}
        </div>

        {/* Tribe & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${tribeStyles.light} ${tribeStyles.text}`}
            >
              {castaway.tribe_original || 'Unknown'}
            </span>
            {castaway.status === 'active' && (
              <span className="text-xs font-bold text-green-600">
                Active
              </span>
            )}
          </div>
          <span
            className={`text-lg font-bold ${
              castaway.status === 'eliminated'
                ? 'text-neutral-400'
                : stats?.total >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
            }`}
          >
            {stats?.total !== undefined ? `${stats.total >= 0 ? '+' : ''}${stats.total}` : '--'} pts
          </span>
        </div>
      </div>
    </Link>
  );
}
