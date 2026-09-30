import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Pause,
  Play,
  RotateCw,
} from "lucide-react";

/** At most this many slides, so the hero never becomes a wall of controls. */
const MAX_SLIDES = 5;

/**
 * One slide per category, capped.
 *
 * This used to build a slide for every product, so the selector underneath
 * rendered one button per product. With long product names that row wrapped,
 * the bar grew, and because it was absolutely positioned it covered the
 * "Explore" call to action. One slide per category keeps the control row short
 * and the layout predictable no matter how large the catalogue becomes.
 */
const getFeaturedSlides = (products) => {
  const seen = new Set();
  const slides = [];

  for (const product of products) {
    const category = product.category?.trim();
    if (!category) continue;
    if (!product.images?.some((image) => image.url)) continue;
    if (Number(product.stock) <= 0) continue;

    const key = category.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    slides.push({
      id: product._id || `${key}-${product.name}`,
      category,
      title: product.name,
      description: product.description,
      image: product.images.find((image) => image.url).url,
      href: `/collection?category=${encodeURIComponent(category)}#products`,
    });
    if (slides.length >= MAX_SLIDES) break;
  }

  return slides;
};

const Hero = ({ products, loading, error, onRetry }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const slides = getFeaturedSlides(products);
  const safeIndex = slides.length ? activeIndex % slides.length : 0;
  const activeSlide = slides[safeIndex];

  useEffect(() => {
    if (
      slides.length < 2 ||
      !autoplayEnabled ||
      isPaused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return undefined;
    const intervalId = window.setInterval(
      () => setActiveIndex((index) => (index + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(intervalId);
  }, [autoplayEnabled, isPaused, slides.length]);

  const showSlide = (index) =>
    setActiveIndex((index + slides.length) % slides.length);

  if (loading) {
    return (
      <section
        aria-label="Featured collection"
        aria-busy="true"
        className="flex min-h-135 items-center justify-center bg-neutral-950 px-6 text-white sm:min-h-155"
      >
        <div className="flex items-center gap-3 text-sm text-white/75">
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />{" "}
          Loading the collection
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-135 flex-col items-center justify-center bg-neutral-950 px-6 text-center text-white sm:min-h-155">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Collection unavailable
        </p>
        <h1 className="mt-4 text-4xl font-medium sm:text-5xl">
          We’ll be right back.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
          The latest products could not be loaded. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-7 inline-flex min-h-11 items-center gap-2 bg-amber-300 px-5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white"
        >
          Try again <RotateCw size={15} aria-hidden="true" />
        </button>
      </section>
    );
  }

  if (!activeSlide) {
    return (
      <section className="flex min-h-135 flex-col items-center justify-center bg-neutral-950 px-6 text-center text-white sm:min-h-155">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
          Astra collection
        </p>
        <h1 className="mt-4 text-4xl font-medium sm:text-5xl">
          A good find is on its way.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
          New arrivals will appear here as soon as they’re available.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Featured collections"
      aria-roledescription="carousel"
      className="relative isolate mx-auto min-h-135 overflow-hidden bg-neutral-950 text-white sm:min-h-155 lg:min-h-[min(76vh,780px)]"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") showSlide(safeIndex - 1);
        if (event.key === "ArrowRight") showSlide(safeIndex + 1);
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setIsPaused(false);
      }}
    >
      <img
        key={activeSlide.id}
        src={activeSlide.image}
        alt={`${activeSlide.title} from ${activeSlide.category}`}
        fetchPriority="high"
        className="absolute inset-0 -z-20 h-full w-full animate-[hero-image-enter_800ms_ease-out] object-cover motion-reduce:animate-none"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(12,16,16,0.78)_0%,rgba(12,16,16,0.48)_44%,rgba(12,16,16,0.04)_100%)] max-sm:bg-[linear-gradient(0deg,rgba(12,16,16,0.84)_0%,rgba(12,16,16,0.48)_56%,rgba(12,16,16,0.06)_100%)]" />

      {/*
        The control bar sits in the normal flow rather than being absolutely
        positioned. When it was absolute it grew with its contents and covered
        the "Explore" call to action, which is exactly what happened once the
        catalogue grew. In flow it reserves its own space instead.
      */}
      <div className="relative mx-auto flex min-h-135 w-full max-w-[1600px] flex-col px-6 pt-20 sm:min-h-155 sm:px-12 lg:min-h-[min(76vh,780px)] lg:px-20">
        <div className="flex flex-1 flex-col justify-end px-0 pb-10 lg:justify-center lg:pb-12">
          <div
            key={activeSlide.id}
            className="max-w-162.5 animate-[hero-copy-enter_600ms_ease-out] motion-reduce:animate-none"
          >
            <p className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase text-white/85 sm:text-xs">
              <span className="h-px w-8 bg-amber-300" />
              {activeSlide.category}
            </p>
            <h1 className="line-clamp-3 text-[clamp(2.75rem,7vw,6.5rem)] font-medium leading-[0.98]">
              {activeSlide.title}
            </h1>
            <p className="mt-5 line-clamp-3 max-w-110 text-sm leading-6 text-white/85 sm:mt-6 sm:text-base sm:leading-7">
              {activeSlide.description}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 sm:mt-9">
              <Link
                to={activeSlide.href}
                className="inline-flex min-h-12 items-center gap-3 bg-amber-300 px-5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
              >
                Explore {activeSlide.category}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a
                href="#best-sellers"
                className="hidden items-center gap-2 text-xs font-medium text-white/85 transition-colors hover:text-white sm:inline-flex"
              >
                Explore the collection{" "}
                <ArrowDown size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {slides.length > 1 && (
          <div className="border-t border-white/20 bg-neutral-950/30 backdrop-blur-sm">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-0 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-0">
            {/*
              A single scrollable row. It was `flex-wrap`, so on a wide
              catalogue the buttons stacked and pushed the bar tall enough to
              cover the copy above it.
            */}
            <div
              role="group"
              aria-label="Choose a featured category"
              className="scrollbar-none -mx-1 flex snap-x snap-mandatory items-center gap-5 overflow-x-auto px-1 pb-1 sm:gap-8"
            >
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Show ${slide.title} from ${slide.category}`}
                  aria-pressed={index === safeIndex}
                  onClick={() => showSlide(index)}
                  className={`flex shrink-0 snap-start items-center gap-2 text-xs font-medium transition-colors sm:gap-3 sm:text-sm ${
                    index === safeIndex
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <span
                    className={`h-px w-5 transition-all sm:w-7 ${index === safeIndex ? "w-8 bg-amber-300 sm:w-9" : "bg-white/50"}`}
                  />
                  <span className="max-w-32 truncate sm:max-w-40">
                    {slide.category}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <p className="min-w-14.5 text-xs tabular-nums text-white/85">
                <span className="font-semibold text-white">
                  {String(safeIndex + 1).padStart(2, "0")}
                </span>
                <span className="mx-1.5 text-white/50">/</span>
                {String(slides.length).padStart(2, "0")}
              </p>
              <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous category"
                onClick={() => showSlide(safeIndex - 1)}
                className="inline-flex size-10 items-center justify-center border border-white/35 transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <ArrowLeft size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next category"
                onClick={() => showSlide(safeIndex + 1)}
                className="inline-flex size-10 items-center justify-center border border-white/35 transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={
                  autoplayEnabled ? "Pause slideshow" : "Play slideshow"
                }
                aria-pressed={!autoplayEnabled}
                onClick={() => setAutoplayEnabled(!autoplayEnabled)}
                className="ml-2 inline-flex size-10 items-center justify-center transition-colors hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                {autoplayEnabled ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
              </button>
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
