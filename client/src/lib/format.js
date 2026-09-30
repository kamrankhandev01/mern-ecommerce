/**
 * Shared number/date formatting so every surface renders money identically.
 */
export const formatPrice = (price, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(price) || 0);

export const formatDate = (date) =>
  date
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(date))
    : "—";

export const formatDateShort = (date) =>
  date
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        new Date(date),
      )
    : "—";

/** Axis-friendly label: 4 Mar, or "Mar 4" in US locale. */
export const formatAxisDate = (date) => {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
};

/** Compact money for chart axes: $1.2k, $18.4k. */
export const formatCompact = (value, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: Math.abs(Number(value) || 0) >= 1000 ? 1 : 0,
  }).format(Number(value) || 0);

export const titleCase = (value = "") =>
  String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
