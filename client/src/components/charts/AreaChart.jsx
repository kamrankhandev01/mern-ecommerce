import { useMemo, useState } from "react";
import { labelIndices, niceMax, palette, scale, smoothPath } from "../../lib/chartUtils";

/**
 * Revenue-over-time area chart.
 *
 * The SVG uses a stretched viewBox with non-scaling strokes, so the curve stays
 * crisp at any width; labels, crosshair and tooltip are plain HTML so text is
 * never distorted.
 */
const AreaChart = ({
  data = [],
  valueKey = "revenue",
  formatValue = (value) => String(value),
  formatLabel = (value) => value,
  height = 200,
  colour = palette.amber,
  id = "area",
}) => {
  const [active, setActive] = useState(null);

  const { points, linePath, areaPath, gridValues } = useMemo(() => {
    const values = data.map((point) => Number(point[valueKey]) || 0);
    const top = niceMax(Math.max(...values, 0));
    const step = data.length > 1 ? 100 / (data.length - 1) : 0;
    const computed = data.map((point, index) => ({
      x: data.length > 1 ? index * step : 50,
      y: 100 - scale(values[index], 0, top, 0, 100),
      value: values[index],
      raw: point,
    }));
    const line = smoothPath(computed);
    const first = computed[0];
    const last = computed.at(-1);
    return {
      points: computed,
      linePath: line,
      areaPath:
        first && last ? `${line} L ${last.x} 100 L ${first.x} 100 Z` : "",
      max: top,
      gridValues: [0, 0.25, 0.5, 0.75, 1].map(
        (ratio) => Math.round(top * (1 - ratio) * 100) / 100,
      ),
    };
  }, [data, valueKey]);

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

  const activePoint = active === null ? null : points[active];

  const handleMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.round(ratio * (data.length - 1));
    setActive(Math.min(Math.max(index, 0), data.length - 1));
  };

  const labels = labelIndices(data.length, 5);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div
          className="flex w-11 shrink-0 flex-col justify-between py-0.5 text-right text-[10px] text-neutral-400 tabular-nums"
          style={{ height }}
        >
          {gridValues.map((value) => (
            <span key={value}>{formatValue(value)}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full"
            style={{ height }}
            role="img"
            aria-label={`${valueKey} over the last ${data.length} days`}
            onMouseMove={handleMove}
            onMouseLeave={() => setActive(null)}
          >
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colour} stopOpacity="0.22" />
                <stop offset="100%" stopColor={colour} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={y === 100 ? 0.25 : 0.08}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={areaPath} fill={`url(#${id}-fill)`} />
            <path
              d={linePath}
              fill="none"
              stroke={colour}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {activePoint && (
            <>
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-px bg-neutral-900/15"
                style={{ left: `${activePoint.x}%` }}
              />
              <div
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
                style={{
                  left: `${activePoint.x}%`,
                  top: `${activePoint.y}%`,
                  backgroundColor: colour,
                }}
              />
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] shadow-lg"
                style={{
                  left: `${Math.min(Math.max(activePoint.x, 6), 94)}%`,
                  top: `calc(${activePoint.y}% - 10px)`,
                }}
              >
                <p className="font-semibold text-neutral-950 tabular-nums">
                  {formatValue(activePoint.value)}
                </p>
                <p className="text-neutral-500">
                  {formatLabel(activePoint.raw.date)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-1.5 ml-13 flex justify-between pl-0.5 text-[10px] text-neutral-400">
        {labels.map((index) => (
          <span key={index}>{formatLabel(data[index]?.date)}</span>
        ))}
      </div>
    </div>
  );
};

export default AreaChart;
