/**
 * Horizontal Bar Chart Component
 *
 * Displays data as horizontal bars with labels and values.
 * Used for leaderboards and rankings.
 */

import { useMemo } from 'react';

interface BarData {
  label: string;
  value: number;
  sublabel?: string;
  color?: string;
}

interface HorizontalBarChartProps {
  data: BarData[];
  valueFormatter?: (value: number) => string;
  maxBars?: number;
  showRank?: boolean;
  colorScale?: 'green' | 'red' | 'gradient' | 'neutral';
  emptyMessage?: string;
}

export function HorizontalBarChart({
  data,
  valueFormatter = (v) => v.toString(),
  maxBars = 10,
  showRank = true,
  colorScale = 'gradient',
  emptyMessage = 'No data available',
}: HorizontalBarChartProps) {
  const displayData = data.slice(0, maxBars);

  const maxValue = useMemo(() => {
    return Math.max(...displayData.map((d) => Math.abs(d.value)), 1);
  }, [displayData]);

  const getBarColor = (value: number, index: number) => {
    if (colorScale === 'green') return 'bg-green-500';
    if (colorScale === 'red') return 'bg-red-500';
    if (colorScale === 'neutral') return 'bg-neutral-400';

    // Gradient from burgundy to amber based on rank
    const colors = [
      'bg-burgundy-500',
      'bg-burgundy-400',
      'bg-rose-500',
      'bg-rose-400',
      'bg-orange-500',
      'bg-orange-400',
      'bg-amber-500',
      'bg-amber-400',
      'bg-yellow-500',
      'bg-yellow-400',
    ];
    return colors[Math.min(index, colors.length - 1)];
  };

  if (!displayData.length) {
    return <div className="py-8 text-center text-neutral-500">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {displayData.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          {showRank && (
            <span className="text-sm font-bold text-neutral-400 w-6 text-right">{index + 1}.</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="truncate">
                <span className="font-medium text-neutral-800">{item.label}</span>
                {item.sublabel && (
                  <span className="text-xs text-neutral-500 ml-2">{item.sublabel}</span>
                )}
              </div>
              <span className="font-bold text-neutral-700 ml-2 shrink-0">
                {valueFormatter(item.value)}
              </span>
            </div>
            <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${item.color || getBarColor(item.value, index)}`}
                style={{ width: `${(Math.abs(item.value) / maxValue) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
