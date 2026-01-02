/**
 * Two Column Leaderboard Component
 *
 * Displays two related rankings side by side.
 * Used for comparing opposites (best/worst, highest/lowest).
 */

interface LeaderboardEntry {
  id: string;
  name: string;
  value: number;
  sublabel?: string;
}

interface TwoColumnLeaderboardProps {
  leftTitle: string;
  leftEntries: LeaderboardEntry[];
  leftColor?: 'green' | 'burgundy' | 'amber';
  rightTitle: string;
  rightEntries: LeaderboardEntry[];
  rightColor?: 'red' | 'neutral' | 'blue';
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  maxEntries?: number;
  emptyMessage?: string;
}

export function TwoColumnLeaderboard({
  leftTitle,
  leftEntries,
  leftColor = 'green',
  rightTitle,
  rightEntries,
  rightColor = 'red',
  valueLabel,
  valueFormatter = (v) => v.toString(),
  maxEntries = 5,
  emptyMessage = 'No entries yet',
}: TwoColumnLeaderboardProps) {
  const leftDisplay = leftEntries.slice(0, maxEntries);
  const rightDisplay = rightEntries.slice(0, maxEntries);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      burgundy: { bg: 'bg-burgundy-50', text: 'text-burgundy-700', border: 'border-burgundy-200' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      neutral: { bg: 'bg-neutral-50', text: 'text-neutral-700', border: 'border-neutral-200' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    };
    return colors[color] || colors.neutral;
  };

  const renderColumn = (title: string, entries: LeaderboardEntry[], color: string) => {
    const colorClasses = getColorClasses(color);

    return (
      <div className="flex-1">
        <div className={`p-3 ${colorClasses.bg} border-b ${colorClasses.border}`}>
          <h4 className={`font-semibold ${colorClasses.text} text-center`}>{title}</h4>
        </div>
        {entries.length === 0 ? (
          <p className="text-neutral-500 text-sm text-center py-4">{emptyMessage}</p>
        ) : (
          <div className="divide-y divide-cream-100">
            {entries.map((entry, index) => (
              <div key={entry.id} className="flex items-center gap-2 p-2.5">
                <span className="text-xs font-bold text-neutral-400 w-5">{index + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{entry.name}</p>
                  {entry.sublabel && (
                    <p className="text-xs text-neutral-500 truncate">{entry.sublabel}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-sm font-bold ${colorClasses.text}`}>
                    {valueFormatter(entry.value)}
                  </span>
                  {valueLabel && (
                    <span className="text-xs text-neutral-400 ml-1">{valueLabel}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      <div className="flex divide-x divide-cream-200">
        {renderColumn(leftTitle, leftDisplay, leftColor)}
        {renderColumn(rightTitle, rightDisplay, rightColor)}
      </div>
    </div>
  );
}
