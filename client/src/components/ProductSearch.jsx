import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LoaderCircle, Search, X } from "lucide-react";
import api from "../lib/api";
import { formatPrice } from "../lib/format";

const ProductSearch = ({ mobile = false, onNavigate }) => {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const instanceId = useId().replaceAll(":", "");
  const resultsId = `product-search-results-${instanceId}`;
  const optionsId = `product-search-options-${instanceId}`;
  const navigate = useNavigate();
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (normalizedQuery.length < 2) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      api
        .get("/api/products/all-products", {
          params: { search: normalizedQuery, limit: 6, sort: "featured" },
          signal: controller.signal,
        })
        .then(({ data }) => {
          if (!Array.isArray(data))
            throw new Error("Unexpected search response");
          setProducts(data);
          setActiveIndex(-1);
        })
        .catch((error) => {
          if (error.code !== "ERR_CANCELED") {
            setProducts([]);
            setSearchFailed(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [normalizedQuery]);

  const openProduct = (product) => {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    navigate(`/product/${product._id}`);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    if (!normalizedQuery) return;
    setOpen(false);
    onNavigate?.();
    navigate(
      `/collection?search=${encodeURIComponent(normalizedQuery)}#products`,
    );
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown" && products.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % products.length);
    }
    if (event.key === "ArrowUp" && products.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? products.length - 1 : index - 1));
    }
    if (event.key === "Enter" && activeIndex >= 0 && products[activeIndex]) {
      event.preventDefault();
      openProduct(products[activeIndex]);
    }
  };

  const showPanel = open && normalizedQuery.length >= 2;

  return (
    <div
      ref={wrapperRef}
      className={`relative ${mobile ? "mx-4 mb-3 lg:hidden" : "hidden max-w-110 flex-1 lg:block"}`}
    >
      <form
        role="search"
        onSubmit={submitSearch}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!wrapperRef.current?.contains(event.relatedTarget))
            setOpen(false);
        }}
        className={`flex items-center gap-3 border-b border-neutral-300 px-1 focus-within:border-neutral-950 ${mobile ? "h-10" : "h-11"}`}
      >
        {loading ? (
          <LoaderCircle
            size={mobile ? 16 : 18}
            className="shrink-0 animate-spin text-neutral-500"
            aria-hidden="true"
          />
        ) : (
          <Search
            size={mobile ? 17 : 18}
            className="shrink-0 text-neutral-500"
            aria-hidden="true"
          />
        )}
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
            setSearchFailed(false);
            const hasSearchTerm = event.target.value.trim().length >= 2;
            if (!hasSearchTerm) setProducts([]);
            setLoading(hasSearchTerm);
          }}
          onKeyDown={handleKeyDown}
          type="search"
          placeholder="Search the collection"
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={optionsId}
          aria-activedescendant={
            activeIndex >= 0 ? `${optionsId}-${activeIndex}` : undefined
          }
          role="combobox"
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setProducts([]);
              setLoading(false);
              setSearchFailed(false);
              setOpen(false);
            }}
            className="inline-flex size-8 shrink-0 items-center justify-center text-neutral-500 hover:text-neutral-950"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </form>

      {showPanel && (
        <div
          id={resultsId}
          role="region"
          aria-label="Product search suggestions"
          className="absolute left-0 right-0 top-full z-70 mt-2 overflow-hidden border border-neutral-200 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.14)]"
        >
          {loading ? (
            <div
              role="status"
              className="flex items-center gap-3 px-4 py-5 text-sm text-neutral-600"
            >
              <LoaderCircle
                size={17}
                className="animate-spin text-amber-700"
                aria-hidden="true"
              />
              Searching the collection…
            </div>
          ) : products.length ? (
            <>
              <div className="border-b border-neutral-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Matching pieces
              </div>
              <div
                id={optionsId}
                role="listbox"
                aria-label="Matching products"
                className="max-h-[min(60vh,360px)] overflow-y-auto py-1"
              >
                {products.map((product, index) => {
                  const image = product.images?.find((item) => item.url)?.url;
                  return (
                    <button
                      id={`${optionsId}-${index}`}
                      key={product._id}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openProduct(product)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${activeIndex === index ? "bg-[#f5f3ed]" : "hover:bg-neutral-50"}`}
                    >
                      <span className="size-12 shrink-0 overflow-hidden bg-neutral-100">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-neutral-900">
                          {product.name}
                        </span>
                        <span className="mt-1 block truncate text-xs text-neutral-500">
                          {product.category}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-neutral-800">
                        {formatPrice(product.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={submitSearch}
                className="flex min-h-11 w-full items-center justify-between border-t border-neutral-200 px-4 text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
              >
                View all results for “{normalizedQuery}”
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </>
          ) : searchFailed ? (
            <div className="px-4 py-5">
              <p className="text-sm font-medium text-neutral-900">
                Search is temporarily unavailable
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Please try again or view all collection results.
              </p>
              <button
                type="button"
                onClick={submitSearch}
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold underline underline-offset-4"
              >
                View collection <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="px-4 py-5">
              <p className="text-sm font-medium text-neutral-900">
                No matches yet
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Try another name, category, or keyword.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
