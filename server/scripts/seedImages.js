/**
 * Deterministic placeholder artwork for seeded products.
 *
 * Remote stock-photo URLs rot: an image host can 404, rate-limit, or block hot
 * linking, and a catalogue full of broken thumbnails looks far worse than plain
 * product art. These are generated as inline SVG data URIs, so they always
 * render, cost nothing, and work offline.
 *
 * In production, replace `makeSvgDataUri` with a real Cloudinary upload.
 */

const PALETTE = {
  Electronics: ["#1c1917", "#44403c", "#a8a29e"],
  Fashion: ["#3f3f46", "#71717a", "#d4d4d8"],
  "Home & Kitchen": ["#44403c", "#78716c", "#d6d3d1"],
  Outdoors: ["#365314", "#65a30d", "#d9f99d"],
  Stationery: ["#1e3a5f", "#3b82f6", "#bfdbfe"],
  Fitness: ["#7f1d1d", "#ef4444", "#fecaca"],
  Lighting: ["#78350f", "#f59e0b", "#fde68a"],
};

/** Stable hash so a given product always gets the same artwork. */
const hash = (value) => {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
};

export const categoryPalette = () => PALETTE;

/** Cloudinary-style public id, so seeded rows look like uploaded assets. */
export const publicIdFor = (category, name) => {
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `products/seed_${slug || hash(category).toString(16)}`;
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Wraps initials in a calm, category-tinted tile. */
export const makeSvgDataUri = (entry, palettes = PALETTE) => {
  const [dark, mid, light] =
    palettes[entry.category] || palettes["Home & Kitchen"];

  const words = String(entry.name).split(/\s+/).slice(0, 3);
  const initials = words
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 3);

  // Subtle rotation keeps tiles from looking mechanically identical.
  const tilt = (hash(entry.name) % 9) - 4;
  const ring = 150 + (hash(entry.category) % 60);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000" role="img" aria-label="${escapeXml(entry.name)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${dark}"/>
      <stop offset="100%" stop-color="${mid}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <circle cx="400" cy="430" r="${ring}" fill="${light}" opacity="0.14"/>
  <g transform="rotate(${tilt} 400 500)">
    <rect x="250" y="330" width="300" height="300" rx="28" fill="none" stroke="${light}" stroke-width="6" opacity="0.5"/>
    <text x="400" y="510" font-family="Georgia, 'Times New Roman', serif" font-size="140" fill="${light}" text-anchor="middle" opacity="0.92">${escapeXml(initials)}</text>
  </g>
  <text x="400" y="880" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="${light}" text-anchor="middle" opacity="0.8">${escapeXml(entry.category)}</text>
</svg>`;

  // encodeURIComponent keeps the data URI valid for any characters in the SVG.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
