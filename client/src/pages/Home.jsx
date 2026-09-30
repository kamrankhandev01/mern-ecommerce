import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  PackageCheck,
  RotateCw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import Hero from "../components/Hero";
import WishlistButton from "../components/WishlistButton";

const Home = () => {
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get("/api/products/best-sellers", { signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data))
          throw new Error("Unexpected products response");
        setBestSellers(data);
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [retryCount]);

  const retryBestSellers = () => {
    setLoading(true);
    setError(false);
    setRetryCount((count) => count + 1);
  };

  const categoryHighlights = [
    ...new Map(
      bestSellers
        .filter((product) => product.category?.trim())
        .map((product) => [product.category.trim().toLowerCase(), product]),
    ).values(),
  ].slice(0, 4);

  return (
    <main>
      <Hero
        products={bestSellers}
        loading={loading}
        error={error}
        onRetry={retryBestSellers}
      />
      {!loading && !error && categoryHighlights.length > 0 && (
        <section className="bg-[#f4f3ef] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="mx-auto max-w-360">
            <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                  Find your next favorite
                </p>
                <h2 className="mt-2 text-2xl font-medium text-neutral-950 sm:text-3xl">
                  Shop by category
                </h2>
              </div>
              <Link
                to="/collection"
                className="hidden items-center gap-2 text-sm font-semibold text-neutral-800 transition-colors hover:text-amber-800 sm:inline-flex"
              >
                View all <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {categoryHighlights.map((product) => {
                const image = product.images?.find((item) => item.url)?.url;
                return (
                  <Link
                    key={product.category}
                    to={`/collection?category=${encodeURIComponent(product.category)}#products`}
                    className="group min-w-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950"
                  >
                    <div className="relative aspect-[1.2/1] overflow-hidden bg-neutral-200 sm:aspect-[1.35/1]">
                      {image && (
                        <img
                          src={image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
                        />
                      )}
                      <span className="absolute inset-0 bg-neutral-950/10 transition-colors group-hover:bg-neutral-950/20" />
                      <span className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-white px-3 py-2.5 text-xs font-semibold text-neutral-950 sm:bottom-4 sm:left-4 sm:right-4 sm:px-4 sm:py-3 sm:text-sm">
                        <span className="truncate">{product.category}</span>
                        <ArrowRight
                          size={15}
                          className="ml-2 shrink-0 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
      <section
        id="best-sellers"
        className="scroll-mt-8 bg-white px-5 py-14 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="mx-auto max-w-360">
          <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                The pieces people come back for
              </p>
              <h2 className="mt-2 text-3xl font-medium text-neutral-950 sm:text-4xl">
                Best sellers
              </h2>
            </div>
            <Link
              to="/collection"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-neutral-900 transition-colors hover:text-amber-700"
            >
              View the full collection{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {loading && (
            <div
              className="grid grid-cols-2 gap-x-4 gap-y-8 pt-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8"
              aria-hidden="true"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="min-w-0">
                  <div className="aspect-4/5 animate-pulse bg-neutral-100 motion-reduce:animate-none" />
                  <div className="flex items-start justify-between gap-3 pt-3">
                    <div className="min-w-0 flex-1">
                      <div className="h-3.5 w-3/4 animate-pulse rounded bg-neutral-100 motion-reduce:animate-none" />
                      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-neutral-100 motion-reduce:animate-none" />
                    </div>
                    <div className="h-3.5 w-12 animate-pulse rounded bg-neutral-100 motion-reduce:animate-none" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && (
            <div className="flex min-h-52 flex-col items-center justify-center text-center">
              <p className="text-sm text-neutral-600">
                Products could not be loaded.
              </p>
              <button
                type="button"
                onClick={retryBestSellers}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
              >
                Try again <RotateCw size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          {!loading && !error && bestSellers.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <p className="text-sm text-neutral-500">
                Our next customer favorites are on their way.
              </p>
              <Link
                to="/collection"
                className="inline-flex min-h-10 items-center gap-2 border border-neutral-300 px-4 text-sm font-medium transition-colors hover:border-neutral-950"
              >
                Browse all products <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          )}

          {!loading && !error && bestSellers.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 pt-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
              {bestSellers.map((product) => {
                const image = product.images?.find((item) => item.url)?.url;
                return (
                  <article key={product._id} className="group relative min-w-0">
                    <Link
                      to={`/product/${product._id}`}
                      className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950"
                    >
                      <div className="relative aspect-4/5 overflow-hidden bg-neutral-100">
                        {image ? (
                          <img
                            src={image}
                            alt={product.name}
                            width={800}
                            height={1000}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                            Image coming soon
                          </div>
                        )}
                        <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-800">
                          Best seller
                        </span>
                        <span className="absolute inset-x-3 bottom-3 flex min-h-10 translate-y-2 items-center justify-center gap-2 bg-white/95 text-xs font-semibold opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 max-sm:hidden">
                          View details{" "}
                          <ArrowRight size={14} aria-hidden="true" />
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3 pt-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-950">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {product.category}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm text-neutral-950">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                    </Link>
                    <WishlistButton product={product} />
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <section
        aria-label="Store services"
        className="border-y border-neutral-200 bg-[#f4f3ef] px-5 py-8 sm:px-8 lg:px-12"
      >
        <div className="mx-auto grid max-w-360 gap-6 sm:grid-cols-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:justify-center">
            <Truck
              size={19}
              className="shrink-0 text-amber-800"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-semibold text-neutral-950">
                Shipping on us
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Complimentary over $75
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:justify-center">
            <PackageCheck
              size={19}
              className="shrink-0 text-amber-800"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-semibold text-neutral-950">
                Know before you choose
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Live availability on every piece
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:justify-center">
            <ShoppingBag
              size={19}
              className="shrink-0 text-amber-800"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-semibold text-neutral-950">
                Your cart stays with you
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Saved to your account between visits
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
