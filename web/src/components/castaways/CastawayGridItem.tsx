import {
  Trophy,
  Star,
  History,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
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

export function CastawayGridItem({
  castaway,
  stats,
  isExpanded,
  onToggleExpand,
}: CastawayGridItemProps) {
  const getOrdinal = (n: number): string => {
    // Handle special cases: 11th, 12th, 13th (and 111th, 112th, 113th, etc.)
    const lastTwo = n % 100;
    if (lastTwo >= 11 && lastTwo <= 13) {
      return n + 'th';
    }
    // Standard ordinal suffixes based on last digit
    const lastOne = n % 10;
    if (lastOne === 1) return n + 'st';
    if (lastOne === 2) return n + 'nd';
    if (lastOne === 3) return n + 'rd';
    return n + 'th';
  };

  // Get tribe color for styling
  const getTribeColor = (tribe: string | null | undefined) => {
    switch (tribe) {
      case 'Vatu':
        return '#7C3AED';
      case 'Kalo':
        return '#0D9488';
      case 'Cila':
        return '#EA580C';
      default:
        return '#6B7280';
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 overflow-hidden hover:shadow-lg transition group cursor-pointer ${
        castaway.status === 'eliminated'
          ? 'border-cream-200 opacity-60'
          : castaway.status === 'winner'
            ? 'border-yellow-300 ring-2 ring-yellow-100'
            : 'border-cream-200'
      }`}
    >
      {/* Square Photo with Status Badge - Compact Variation A Style */}
      <div
        className={`aspect-square relative ${castaway.status === 'eliminated' ? 'grayscale' : ''}`}
      >
        <img
          src={getAvatarUrl(castaway.name, castaway.photo_url)}
          alt={castaway.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (castaway.photo_url && !target.src.includes('dicebear')) {
              target.src = getAvatarUrl(castaway.name, null);
            }
          }}
        />
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {castaway.status === 'active' ? (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              ACTIVE
            </span>
          ) : castaway.status === 'winner' ? (
            <span className="bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Trophy className="h-3 w-3" /> WINNER
            </span>
          ) : (
            <span className="bg-neutral-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              EP {castaway.episodes?.number || '?'}
            </span>
          )}
        </div>
      </div>

      {/* Compact Info Section */}
      <div className="p-3 text-center">
        <p
          className={`font-semibold truncate ${
            castaway.status === 'eliminated' ? 'text-neutral-500' : 'text-neutral-800'
          }`}
        >
          {castaway.name}
        </p>
        {castaway.occupation && (
          <p className="text-xs text-neutral-500 truncate">{castaway.occupation}</p>
        )}
        <p
          className="text-sm font-bold mt-1"
          style={{
            color:
              castaway.status === 'eliminated' ? '#9CA3AF' : getTribeColor(castaway.tribe_original),
          }}
        >
          {stats?.total !== undefined
            ? `${stats.total >= 0 ? '+' : ''}${stats.total} pts`
            : '-- pts'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex border-t border-cream-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(isExpanded ? null : castaway.id);
          }}
          className="flex-1 px-3 py-2 bg-cream-50 flex items-center justify-center gap-1 text-xs text-neutral-600 hover:bg-cream-100 transition-colors"
        >
          {isExpanded ? (
            <>
              Hide <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Quick View <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
        <Link
          to={`/castaways/${castaway.id}`}
          className="flex-1 px-3 py-2 bg-burgundy-50 flex items-center justify-center gap-1 text-xs text-burgundy-600 hover:bg-burgundy-100 transition-colors border-l border-cream-100"
        >
          Full Profile <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 border-t border-cream-100 bg-cream-50 space-y-4 overflow-hidden">
          {/* Trivia Section */}
          <div className="space-y-3 overflow-hidden">
            {/* Previous Seasons */}
            {castaway.previous_seasons && castaway.previous_seasons.length > 0 && (
              <div className="bg-white rounded-lg border border-cream-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-4 w-4 text-burgundy-500" />
                  <span className="text-sm font-semibold text-neutral-700">
                    {castaway.previous_seasons.length} Previous Season
                    {castaway.previous_seasons.length > 1 ? 's' : ''}
                  </span>
                  {castaway.best_placement && (
                    <span className="ml-auto flex items-center gap-1 text-xs">
                      <Award className="h-3 w-3 text-yellow-500" />
                      <span
                        className={
                          castaway.best_placement === 1
                            ? 'text-yellow-600 font-semibold'
                            : 'text-neutral-500'
                        }
                      >
                        Best:{' '}
                        {castaway.best_placement === 1
                          ? 'Winner'
                          : `${getOrdinal(castaway.best_placement)} place`}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {castaway.previous_seasons.map((season: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-xs bg-cream-100 text-neutral-600 px-2 py-1 rounded-full"
                    >
                      {season}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fun Fact */}
            {castaway.fun_fact && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200 p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-neutral-700 break-words">{castaway.fun_fact}</p>
                </div>
              </div>
            )}

            {/* Show message if no trivia data */}
            {!castaway.previous_seasons?.length && !castaway.fun_fact && (
              <div className="bg-white rounded-lg border border-cream-200 p-3 text-center">
                <p className="text-sm text-neutral-500">No additional information available</p>
              </div>
            )}
          </div>

          {/* Weekly Performance - Always show this section */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-burgundy-500" />
              Weekly Performance
            </h4>

            {stats?.byEpisode && Object.keys(stats.byEpisode).length > 0 ? (
              <div className="space-y-2">
                {(() => {
                  // Calculate max points for scaling the progress bar
                  const episodePoints = Object.values(stats.byEpisode).map((pts) =>
                    Math.abs(Number(pts))
                  );
                  const maxPoints = Math.max(...episodePoints, 1); // Minimum 1 to avoid division by zero

                  return Object.entries(stats.byEpisode)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([epNum, pts]) => (
                      <div
                        key={epNum}
                        className="flex items-center gap-3 p-2 bg-white rounded-lg border border-cream-200"
                      >
                        <div className="w-16 text-center">
                          <p className="text-xs text-neutral-500">Episode</p>
                          <p className="font-bold text-neutral-800">{epNum}</p>
                        </div>
                        <div className="flex-1 h-2 bg-cream-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              Number(pts) >= 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min((Math.abs(Number(pts)) / maxPoints) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <div
                          className={`w-16 text-right font-bold ${
                            Number(pts) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {Number(pts) >= 0 ? '+' : ''}
                          {pts}
                        </div>
                      </div>
                    ));
                })()}

                {/* Total Summary */}
                <div className="mt-4 pt-4 border-t border-cream-200 flex justify-between items-center">
                  <span className="font-medium text-neutral-600">Season Total</span>
                  <span
                    className={`text-2xl font-bold ${
                      stats.total >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stats.total >= 0 ? '+' : ''}
                    {stats.total}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-white rounded-lg border border-cream-200">
                <Star className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-neutral-400 text-sm">No scores recorded yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
