import {
  Trophy,
  Skull,
  Flame,
  MapPin,
  Briefcase,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  History,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-neutral-400" />;
  };

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

  return (
    <div
      className={`bg-white rounded-2xl shadow-card border overflow-hidden transition-all hover:shadow-card-hover ${
        castaway.status === 'eliminated'
          ? 'border-neutral-200'
          : castaway.status === 'winner'
            ? 'border-yellow-300 ring-2 ring-yellow-100'
            : 'border-cream-200'
      }`}
    >
      {/* Header - Vertical layout for better text fitting */}
      <div className={`p-5 ${castaway.status === 'eliminated' ? 'bg-neutral-50' : 'bg-white'}`}>
        {/* Photo and Points Row */}
        <div className="flex items-start gap-4 mb-4">
          {/* Photo */}
          <div className="relative flex-shrink-0">
            <img
              src={getAvatarUrl(castaway.name, castaway.photo_url)}
              alt={castaway.name}
              className={`w-20 h-20 rounded-full object-cover border-3 ${
                castaway.status === 'eliminated'
                  ? 'border-neutral-200 grayscale'
                  : castaway.status === 'winner'
                    ? 'border-yellow-400'
                    : 'border-burgundy-200'
              }`}
              onError={(e) => {
                // Fallback to DiceBear if image fails to load
                const target = e.target as HTMLImageElement;
                if (castaway.photo_url && !target.src.includes('dicebear')) {
                  target.src = getAvatarUrl(castaway.name, null);
                }
              }}
            />
            {/* Status Badge */}
            <div
              className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                castaway.status === 'winner'
                  ? 'bg-yellow-400'
                  : castaway.status === 'eliminated'
                    ? 'bg-neutral-400'
                    : 'bg-green-500'
              }`}
            >
              {castaway.status === 'winner' ? (
                <Trophy className="h-3 w-3 text-yellow-900" />
              ) : castaway.status === 'eliminated' ? (
                <Skull className="h-3 w-3 text-white" />
              ) : (
                <Flame className="h-3 w-3 text-white" />
              )}
            </div>
          </div>

          {/* Points - Moved to top right */}
          <div className="flex-1 flex justify-end">
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                {stats && getTrendIcon(stats.trend)}
                <span
                  className={`text-2xl font-bold ${
                    (stats?.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stats?.total !== undefined ? (stats.total >= 0 ? '+' : '') + stats.total : '-'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">points</p>
            </div>
          </div>
        </div>

        {/* Info - Full width below photo */}
        <div className="space-y-2">
          {/* Name and Tribe */}
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-bold text-lg leading-tight ${
                castaway.status === 'eliminated' ? 'text-neutral-500' : 'text-neutral-800'
              }`}
            >
              {castaway.name}
            </h3>
            {castaway.tribe_original && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0"
                style={{
                  backgroundColor:
                    castaway.tribe_original === 'Vatu'
                      ? '#EDE9FE'
                      : castaway.tribe_original === 'Kalo'
                        ? '#CCFBF1'
                        : castaway.tribe_original === 'Cila'
                          ? '#FFEDD5'
                          : '#F3F4F6',
                  borderColor:
                    castaway.tribe_original === 'Vatu'
                      ? '#A78BFA'
                      : castaway.tribe_original === 'Kalo'
                        ? '#5EEAD4'
                        : castaway.tribe_original === 'Cila'
                          ? '#FB923C'
                          : '#9CA3AF',
                  color:
                    castaway.tribe_original === 'Vatu'
                      ? '#7C3AED'
                      : castaway.tribe_original === 'Kalo'
                        ? '#0D9488'
                        : castaway.tribe_original === 'Cila'
                          ? '#EA580C'
                          : '#6B7280',
                }}
              >
                {castaway.tribe_original}
              </span>
            )}
          </div>

          {/* Occupation - with text wrapping */}
          {castaway.occupation && (
            <p className="text-neutral-500 text-sm flex items-start gap-1.5">
              <Briefcase className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{castaway.occupation}</span>
            </p>
          )}

          {/* Age and Hometown */}
          {(castaway.age || castaway.hometown) && (
            <p className="text-neutral-400 text-sm flex items-start gap-1.5">
              {castaway.age && (
                <>
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>{castaway.age}</span>
                </>
              )}
              {castaway.age && castaway.hometown && <span className="mx-1">·</span>}
              {castaway.hometown && (
                <>
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{castaway.hometown}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Eliminated/Winner Badge */}
      {castaway.status === 'eliminated' && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-red-600 text-sm flex items-center gap-2">
            <Skull className="h-4 w-4" />
            Eliminated Episode {castaway.episodes?.number}
            {castaway.placement && ` · ${getOrdinal(castaway.placement)} place`}
          </p>
        </div>
      )}

      {castaway.status === 'winner' && (
        <div className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border-t border-yellow-200">
          <p className="text-yellow-700 text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Sole Survivor
          </p>
        </div>
      )}

      {/* Expand Button */}
      <button
        onClick={() => onToggleExpand(isExpanded ? null : castaway.id)}
        className="w-full px-4 py-3 bg-cream-50 border-t border-cream-100 flex items-center justify-center gap-2 text-sm text-neutral-600 hover:bg-cream-100 transition-colors"
      >
        {isExpanded ? (
          <>
            Hide Details <ChevronUp className="h-4 w-4" />
          </>
        ) : (
          <>
            View Week by Week <ChevronDown className="h-4 w-4" />
          </>
        )}
      </button>

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
