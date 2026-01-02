/**
 * Vertical Bar Chart Component
 *
 * Displays data as vertical bars with labels.
 * Used for comparisons and distributions.
 */

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  height?: number;
  valueFormatter?: (value: number) => string;
  defaultColor?: string;
  emptyMessage?: string;
}

export function BarChart({
  data,
  height = 180,
  valueFormatter = (v) => v.toString(),
  defaultColor = '#722F37',
  emptyMessage = 'No data available',
}: BarChartProps) {
  if (!data.length) {
    return <div className="py-8 text-center text-neutral-500">{emptyMessage}</div>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(60, Math.floor(100 / data.length) - 2);

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-around" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 40);
          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-neutral-700">
                {valueFormatter(item.value)}
              </span>
              <div
                className="rounded-t transition-all"
                style={{
                  width: `${barWidth}px`,
                  height: `${barHeight}px`,
                  backgroundColor: item.color || defaultColor,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-around">
        {data.map((item, index) => (
          <span
            key={index}
            className="text-xs text-neutral-500 text-center truncate"
            style={{ width: `${barWidth + 8}px` }}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
