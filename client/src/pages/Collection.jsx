import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, RotateCw, Search } from "lucide-react";
import api from "../lib/api";
import WishlistButton from "../components/WishlistButton";
import { formatPrice } from "../lib/format";

const EMPTY_PRODUCTS = [];

const Collection = () => {
  const [result, setResult] = useState({
    requestId: null,
    products: [],
    error: false,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") || "";
  const searchQuery = searchParams.get("search")?.trim() || "";
  const sortBy = searchParams.get("sort") || "featured";
  const queryString = searchParams.toString();
  const requestId = `${queryString}:${retryCount}`;
  const loading = result.requestId !== requestId;
  const error = !loading && result.error;
  const products = loading ? EMPTY_PRODUCTS : result.products;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(queryString);
    // The API caps a page at 100 items; asking for the cap keeps the whole
    // catalogue visible without client-side paging in this view.
    params.set("limit", "100");

    api
      .get("/api/products/all-products", { params, signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data))
          throw new Error("Unexpected products response");
        setResult({ requestId, products: data, error: false });
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED")
          setResult({ requestId, products: [], error: true });
      });

    return () => controller.abort();
  }, [queryString, requestId]);

  const retryProducts = () => setRetryCount((count) => count + 1);

  const categories = useMemo(
    () => [
      ...new Map(
        products
          .filter((product) => product.category?.trim())
          .map((product) => [
            product.category.trim().toLowerCase(),
            product.category.trim(),
          ]),
      ).values(),
    ],
    [products],
  );

  const visibleProducts = products;

  const updateFilter = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set(key, value);
    else nextParams.delete(key);
    setSearchParams(nextParams);
  };

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <section className="border-b border-neutral-200 bg-[#f4f3ef] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto flex max-w-360 flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Astra / The collection
            </p>
            <h1 className="mt-3 text-4xl font-medium leading-tight sm:text-5xl">
              Considered for the everyday.
            </h1>
          </div>
          <div className="max-w-md">
            <p className="text-sm leading-6 text-neutral-600">
              Find the pieces worth keeping, selected from across the
              collection.
            </p>
            {searchQuery && (
              <p className="mt-2 text-sm text-neutral-500">
                Results for{" "}
                <span className="font-medium text-neutral-900">
                  “{searchParams.get("search")?.trim()}”
                </span>
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        id="products"
        className="scroll-mt-6 px-5 py-10 sm:px-8 sm:py-14 lg:px-12"
      >
        <div className="mx-auto max-w-360">
          <div className="flex flex-col gap-5 border-b border-neutral-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="scrollbar-none -mx-1 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-1 pb-1"
              aria-label="Filter by category"
            >
              <button
                type="button"
                aria-pressed={!selectedCategory}
                onClick={() => updateFilter("category", "")}
                className={`shrink-0 border px-4 py-2.5 text-xs font-medium transition-colors ${!selectedCategory ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-700 hover:border-neutral-950"}`}
              >
                All pieces
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={
                    selectedCategory.toLowerCase() === category.toLowerCase()
                  }
                  onClick={() => updateFilter("category", category)}
                  className={`shrink-0 border px-4 py-2.5 text-xs font-medium transition-colors ${selectedCategory.toLowerCase() === category.toLowerCase() ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-300 text-neutral-700 hover:border-neutral-950"}`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-neutral-500" aria-live="polite">
                {loading
                  ? "Loading"
                  : `${visibleProducts.length} ${visibleProducts.length === 1 ? "piece" : "pieces"}`}
              </p>
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                <span>Sort</span>
                <select
                  aria-label="Sort products"
                  value={sortBy}
                  onChange={(event) =>
                    updateFilter(
                      "sort",
                      event.target.value === "featured"
                        ? ""
                        : event.target.value,
                    )
                  }
                  className="h-10 border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-950"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
            </div>
          </div>

          {loading && (
            <div
              className="grid grid-cols-2 gap-x-4 gap-y-9 pt-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8"
              aria-hidden="true"
            >
              {Array.from({ length: 8 }, (_, index) => (
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
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <p className="text-sm text-neutral-600">
                The collection could not be loaded.
              </p>
              <button
                type="button"
                onClick={retryProducts}
                className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold underline underline-offset-4"
              >
                Try again <RotateCw size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {!loading && !error && visibleProducts.length === 0 && (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <Search
                size={22}
                className="text-neutral-400"
                aria-hidden="true"
              />
              <p className="mt-4 text-sm text-neutral-600">
                {products.length
                  ? "No pieces match those filters."
                  : "The collection is being prepared."}
              </p>
              {(selectedCategory || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.delete("category");
                    nextParams.delete("search");
                    setSearchParams(nextParams);
                  }}
                  className="mt-3 text-sm font-semibold underline underline-offset-4"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && visibleProducts.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 pt-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
              {visibleProducts.map((product) => {
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
                        {product.isBestSeller && (
                          <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-800">
                            Best seller
                          </span>
                        )}
                        {Number(product.stock) <= 0 && (
                          <span className="absolute bottom-3 left-3 bg-neutral-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                            Sold out
                          </span>
                        )}
                        {Number(product.stock) > 0 && (
                          <span className="absolute inset-x-3 bottom-3 flex min-h-10 translate-y-2 items-center justify-center gap-2 bg-white/95 text-xs font-semibold opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 max-sm:hidden">
                            View details{" "}
                            <ArrowRight size={14} aria-hidden="true" />
                          </span>
                        )}
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
    </main>
  );
};

export default Collection;
