/**
 * Line Chart Component
 *
 * Displays data points connected by lines.
 * Used for trends and time series data.
 */

interface DataPoint {
  x: string | number;
  y: number;
}

interface LineData {
  label: string;
  data: DataPoint[];
  color: string;
}

interface LineChartProps {
  lines: LineData[];
  height?: number;
  showLegend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  emptyMessage?: string;
}

export function LineChart({
  lines,
  height = 200,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
  emptyMessage = 'No data available',
}: LineChartProps) {
  if (!lines.length || lines.every((l) => !l.data.length)) {
    return <div className="py-8 text-center text-neutral-500">{emptyMessage}</div>;
  }

  // Calculate bounds
  const allY = lines.flatMap((l) => l.data.map((d) => d.y));
  const minY = Math.min(...allY, 0);
  const maxY = Math.max(...allY, 1);
  const range = maxY - minY || 1;

  // Get all x values (assuming all lines have same x points)
  const xValues = lines[0]?.data.map((d) => d.x) || [];
  const width = 100;

  const getY = (value: number) => {
    return height - ((value - minY) / range) * (height - 20) - 10;
  };

  const getX = (index: number) => {
    return (index / Math.max(xValues.length - 1, 1)) * (width - 10) + 5;
  };

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = getY(minY + ratio * range);
          return (
            <g key={i}>
              <line
                x1={5}
                x2={width - 5}
                y1={y}
                y2={y}
                stroke="#E5E0D8"
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
              <text x={2} y={y + 3} fontSize={6} fill="#9CA3AF" textAnchor="start">
                {Math.round(minY + ratio * range)}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        {lines.map((line, lineIndex) => {
          if (!line.data.length) return null;

          const pathData = line.data
            .map((point, i) => {
              const x = getX(i);
              const y = getY(point.y);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

          return (
            <g key={lineIndex}>
              <path
                d={pathData}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {line.data.map((point, i) => (
                <circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(point.y)}
                  r={2.5}
                  fill="white"
                  stroke={line.color}
                  strokeWidth={1.5}
                />
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        {xValues.map((x, i) => (
          <text key={i} x={getX(i)} y={height - 2} fontSize={6} fill="#9CA3AF" textAnchor="middle">
            {x}
          </text>
        ))}
      </svg>

      {showLegend && lines.length > 1 && (
        <div className="flex flex-wrap justify-center gap-4">
          {lines.map((line, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: line.color }} />
              <span className="text-sm text-neutral-600">{line.label}</span>
            </div>
          ))}
        </div>
      )}

      {(xAxisLabel || yAxisLabel) && (
        <div className="flex justify-between text-xs text-neutral-400">
          {yAxisLabel && <span>{yAxisLabel}</span>}
          {xAxisLabel && <span>{xAxisLabel}</span>}
        </div>
      )}
    </div>
  );
}
