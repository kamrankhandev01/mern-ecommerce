import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import api from "../lib/api";

/**
 * Announcement strip.
 *
 * Rotates through the store's real categories, each linking to that category,
 * and can be dismissed. Dismissal is remembered per browser via localStorage so
 * a customer who closes it does not see it again. Rotation pauses for
 * reduced-motion users rather than animating.
 *
 * The strip used to show three hardcoded strings, so it advertised the same
 * thing on every page regardless of what the shop actually stocked.
 */
const STORE_MESSAGES = [
  {
    text: "Complimentary tracked shipping over $75",
    to: "/collection",
    label: "Explore",
  },
  {
    text: "30-day returns, no questions asked",
    to: "/contact",
    label: "Our policy",
  },
];

const STORAGE_KEY = "astra:announcement-dismissed";
const ROTATE_MS = 6000;

const AnnouncementBar = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Private mode / blocked storage: just show the bar.
      return false;
    }
  });
  const [categories, setCategories] = useState([]);
  const [index, setIndex] = useState(0);

  // One small request, shared by every page via the navbar.
  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/api/products/categories", { signal: controller.signal })
      .then(({ data }) => {
        if (Array.isArray(data?.categories)) setCategories(data.categories);
      })
      .catch(() => {
        // A missing banner is not worth surfacing; fall back to store messages.
      });
    return () => controller.abort();
  }, []);

  const announcements = useMemo(() => {
    const fromCategories = categories.map((category) => ({
      text:
        category.featured?.name && category.featured.name !== category.name
          ? `${category.name} — ${category.featured.name}`
          : category.name,
      to: `/collection?category=${encodeURIComponent(category.name)}`,
      label: "Shop",
    }));
    return [...fromCategories, ...STORE_MESSAGES];
  }, [categories]);

  // Clamped during render rather than in an effect: the category list arrives
  // after the first paint, so the index can briefly point past the end.
  const activeIndex =
    announcements.length > 0 ? index % announcements.length : 0;

  useEffect(() => {
    if (dismissed || announcements.length < 2) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const id = window.setInterval(
      () => setIndex((value) => (value + 1) % announcements.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [announcements.length, dismissed]);

  if (dismissed) return null;

  const current = announcements[activeIndex];
  if (!current) return null;

  return (
    <div className="relative flex min-h-9 items-center justify-center bg-neutral-950 py-1.5 pr-9 pl-4 text-center text-[11px] font-medium text-white sm:pl-10">
      {/*
        The text and the link are separate elements. Truncating a single
        paragraph that also contains a link clips the link mid-word on narrow
        screens, and `aria-live` would re-announce the whole strip every time
        it rotates.
      */}
      <p className="min-w-0 truncate">{current.text}</p>
      <Link
        to={current.to}
        className="ml-2 inline-flex shrink-0 items-center gap-1 whitespace-nowrap underline underline-offset-2 hover:text-amber-300"
      >
        {current.label} <ArrowRight size={12} aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            window.localStorage.setItem(STORAGE_KEY, "1");
          } catch {
            // Nothing to do — it simply reappears next visit.
          }
        }}
        aria-label="Dismiss announcement"
        className="absolute right-2.5 inline-flex size-6 items-center justify-center text-white/60 transition-colors hover:text-white"
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  );
};

export default AnnouncementBar;
