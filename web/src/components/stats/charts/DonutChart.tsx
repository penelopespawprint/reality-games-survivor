/**
 * Donut Chart Component
 *
 * Displays data as a donut/pie chart with legend.
 * Used for distributions and percentages.
 */

interface DonutData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutData[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  showTotal?: boolean;
  totalLabel?: string;
  emptyMessage?: string;
}

export function DonutChart({
  data,
  size = 160,
  strokeWidth = 24,
  showLegend = true,
  showTotal = true,
  totalLabel = 'Total',
  emptyMessage = 'No data available',
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (!data.length || total === 0) {
    return <div className="py-8 text-center text-neutral-500">{emptyMessage}</div>;
  }

  // Calculate segments
  let currentAngle = 0;
  const segments = data.map((item) => {
    const percentage = item.value / total;
    const dashLength = percentage * circumference;
    const dashOffset = circumference - (currentAngle / 360) * circumference;
    currentAngle += percentage * 360;
    return { ...item, percentage, dashLength, dashOffset };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F5F3EF"
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {segments.map((segment, index) => (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segment.dashLength} ${circumference - segment.dashLength}`}
              strokeDashoffset={segment.dashOffset}
              className="transition-all"
            />
          ))}
        </svg>
        {showTotal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-neutral-800">{total}</span>
            <span className="text-xs text-neutral-500">{totalLabel}</span>
          </div>
        )}
      </div>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-neutral-600">
                {item.label} ({item.value})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
