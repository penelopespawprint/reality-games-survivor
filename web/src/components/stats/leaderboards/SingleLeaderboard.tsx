/**
 * Single Leaderboard Component
 *
 * Displays a ranked list with avatars, names, and values.
 */

import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl?: string;
  value: number;
  sublabel?: string;
}

interface SingleLeaderboardProps {
  title: string;
  entries: LeaderboardEntry[];
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  maxEntries?: number;
  emptyMessage?: string;
  showMedals?: boolean;
}

export function SingleLeaderboard({
  title,
  entries,
  valueLabel = 'Points',
  valueFormatter = (v) => v.toString(),
  maxEntries = 10,
  emptyMessage = 'No entries yet',
  showMedals = true,
}: SingleLeaderboardProps) {
  const displayEntries = entries.slice(0, maxEntries);

  const getRankIcon = (rank: number) => {
    if (!showMedals) return null;
    if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-neutral-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
    return null;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-amber-50 border-amber-200';
    if (rank === 2) return 'bg-neutral-50 border-neutral-200';
    if (rank === 3) return 'bg-orange-50 border-orange-200';
    return 'bg-white border-cream-200';
  };

  if (!displayEntries.length) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6">
        <h3 className="font-display font-bold text-neutral-800 mb-4">{title}</h3>
        <p className="text-neutral-500 text-center py-4">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      <div className="p-4 border-b border-cream-100">
        <h3 className="font-display font-bold text-neutral-800">{title}</h3>
      </div>
      <div className="divide-y divide-cream-100">
        {displayEntries.map((entry, index) => {
          const rank = index + 1;
          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 ${getRankBg(rank)} border-l-4`}
            >
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(rank) || (
                  <span className="text-sm font-bold text-neutral-400">{rank}</span>
                )}
              </div>
              {entry.avatarUrl ? (
                <img
                  src={entry.avatarUrl}
                  alt={entry.name}
                  className="w-10 h-10 rounded-full object-cover border border-cream-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-burgundy-100 flex items-center justify-center">
                  <span className="font-bold text-burgundy-600">{entry.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-800 truncate">{entry.name}</p>
                {entry.sublabel && <p className="text-xs text-neutral-500">{entry.sublabel}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-neutral-800">{valueFormatter(entry.value)}</p>
                <p className="text-xs text-neutral-400">{valueLabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
