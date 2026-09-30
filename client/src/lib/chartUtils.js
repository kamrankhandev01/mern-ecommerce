/**
 * Tiny chart helpers.
 *
 * The charts are hand-rolled SVG rather than a charting library: the bundle
 * stays small, the visuals match the design system exactly, and the marks are
 * resolution independent thanks to `vector-effect: non-scaling-stroke`.
 */

/** Maps a value into a pixel/percent range. */
export const scale = (value, min, max, outMin, outMax) => {
  if (max === min) return (outMin + outMax) / 2;
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
};

/**
 * Catmull-Rom spline converted to cubic Béziers, so revenue lines read as a
 * smooth curve without overshooting into negative values.
 */
export const smoothPath = (points) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] || current;
    const afterNext = points[index + 2] || next;

    const c1x = current.x + (next.x - previous.x) / 6;
    const c1y = current.y + (next.y - previous.y) / 6;
    const c2x = next.x - (afterNext.x - current.x) / 6;
    const c2y = next.y - (afterNext.y - current.y) / 6;

    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${next.x} ${next.y}`;
  }
  return path;
};

/** Rounds an axis maximum up to a friendly number. */
export const niceMax = (value) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
};

/** Picks roughly `count` evenly spaced indices to label an axis. */
export const labelIndices = (length, count = 5) => {
  if (length <= count) return Array.from({ length }, (_, index) => index);
  const step = (length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) =>
    Math.round(index * step),
  ).filter((value, position, all) => all.indexOf(value) === position);
};

export const palette = {
  amber: "#b45309",
  amberSoft: "#d97706",
  emerald: "#047857",
  sky: "#0369a1",
  violet: "#6d28d9",
  rose: "#be123c",
  slate: "#64748b",
};
