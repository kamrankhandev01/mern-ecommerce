import { palette, scale, smoothPath } from "../../lib/chartUtils";

/** Compact trend line for KPI cards. */
const Sparkline = ({
  values = [],
  colour = palette.amber,
  height = 34,
  className = "",
}) => {
  const numbers = values.map((value) => Number(value) || 0);
  if (numbers.length < 2) {
    return <div className={className} style={{ height }} aria-hidden="true" />;
  }

  const max = Math.max(...numbers);
  const min = Math.min(...numbers, 0);
  const step = 100 / (numbers.length - 1);
  const points = numbers.map((value, index) => ({
    x: index * step,
    y: 100 - scale(value, min, max, 0, 100),
  }));
  const line = smoothPath(points);
  const first = points[0];
  const last = points.at(-1);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${colour.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.2" />
          <stop offset="100%" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${line} L ${last.x} 100 L ${first.x} 100 Z`}
        fill={`url(#spark-${colour.replace("#", "")})`}
      />
      <path
        d={line}
        fill="none"
        stroke={colour}
        strokeWidth="1.75"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default Sparkline;
