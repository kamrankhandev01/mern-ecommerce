import { useState } from "react";
import { labelIndices, niceMax, palette, scale } from "../../lib/chartUtils";

/** Orders-per-day column chart with a hover tooltip. */
const BarChart = ({
  data = [],
  valueKey = "orders",
  formatValue = (value) => String(value),
  formatLabel = (value) => value,
  height = 160,
  colour = palette.sky,
}) => {
  const [active, setActive] = useState(null);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-neutral-400"
        style={{ height }}
      >
        No data for this range yet
      </div>
    );
  }

  const values = data.map((point) => Number(point[valueKey]) || 0);
  const top = niceMax(Math.max(...values, 0));
  const labels = labelIndices(data.length, 5);
  const barWidth = 100 / Math.max(data.length, 1);

  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${valueKey} per day`}
        onMouseLeave={() => setActive(null)}
      >
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeOpacity={y === 100 ? 0.2 : 0.07}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {data.map((point, index) => {
          const value = Number(point[valueKey]) || 0;
          const barHeight = scale(value, 0, top, 0, 100);
          const x = index * barWidth;
          const inset = barWidth * 0.22;
          return (
            <g key={point.date ?? index}>
              <rect
                x={x + inset}
                y={100 - barHeight}
                width={Math.max(barWidth - inset * 2, 0.4)}
                height={barHeight}
                rx="1"
                fill={colour}
                fillOpacity={active === null || active === index ? 0.85 : 0.3}
              />
              <rect
                x={x}
                y="0"
                width={barWidth}
                height="100"
                fill="transparent"
                onMouseEnter={() => setActive(index)}
              />
            </g>
          );
        })}
      </svg>

      {active !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{
            left: `${Math.min(Math.max(active * barWidth + barWidth / 2, 6), 94)}%`,
            top: `${scale(values[active] || 0, 0, top, 0, 100)}%`,
          }}
        >
          <p className="font-semibold text-neutral-950 tabular-nums">
            {formatValue(values[active] || 0)}
          </p>
          <p className="text-neutral-500">{formatLabel(data[active]?.date)}</p>
        </div>
      )}

      <div className="mt-1.5 flex justify-between text-[10px] text-neutral-400">
        {labels.map((index) => (
          <span key={index}>{formatLabel(data[index]?.date)}</span>
        ))}
      </div>
    </div>
  );
};

export default BarChart;
