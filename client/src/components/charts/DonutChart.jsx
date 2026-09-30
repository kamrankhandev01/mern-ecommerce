import { useMemo } from "react";
import { palette } from "../../lib/chartUtils";

const COLOURS = [
  palette.amber,
  palette.emerald,
  palette.sky,
  palette.violet,
  palette.rose,
  palette.slate,
];

/** Donut breakdown with a centred total and a labelled legend. */
const DonutChart = ({
  data = [],
  valueKey = "revenue",
  formatValue = (value) => String(value),
  centreLabel = "Total",
}) => {
  const total = data.reduce(
    (sum, entry) => sum + (Number(entry[valueKey]) || 0),
    0,
  );

  // Offsets are precomputed so nothing is mutated while rendering.
  const segments = useMemo(() => {
    const shares = data.map((entry) => {
      const value = Number(entry[valueKey]) || 0;
      return total > 0 ? value / total : 0;
    });
    return data.map((entry, index) => ({
      id: entry.id ?? index,
      label: entry.label || entry.id,
      value: Number(entry[valueKey]) || 0,
      colour: COLOURS[index % COLOURS.length],
      dash: shares[index] * 100,
      // Cumulative offset, derived rather than accumulated.
      offset: shares.slice(0, index).reduce((sum, share) => sum + share, 0) * 100,
      percentage: Math.round(shares[index] * 1000) / 10,
    }));
  }, [data, total, valueKey]);

  if (total <= 0) {
    return (
      <p className="py-10 text-center text-sm text-neutral-500">
        No payments recorded in this range.
      </p>
    );
  }

  const radius = 15.9155; // 2πr = 100

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 42 42" className="size-full -rotate-90">
          {segments.map((segment) => (
            <circle
              key={segment.id}
              cx="21"
              cy="21"
              r={radius}
              fill="none"
              stroke={segment.colour}
              strokeWidth="4.5"
              strokeDashArray={`${segment.dash} ${100 - segment.dash}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] tracking-widest text-neutral-400 uppercase">
            {centreLabel}
          </span>
          <span className="text-lg font-semibold text-neutral-950 tabular-nums">
            {formatValue(total)}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {segments.map((segment) => (
          <li key={segment.id} className="flex items-center gap-2.5 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: segment.colour }}
            />
            <span className="min-w-0 flex-1 truncate capitalize text-neutral-700">
              {segment.label}
            </span>
            <span className="shrink-0 text-neutral-400 tabular-nums">
              {segment.percentage}%
            </span>
            <span className="w-20 shrink-0 text-right font-medium text-neutral-950 tabular-nums">
              {formatValue(segment.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DonutChart;
