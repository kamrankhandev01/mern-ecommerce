import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  Expand,
  LoaderCircle,
  Minus,
  Plus,
  RotateCw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import { useCart } from "../hooks/useCart";
import { useScrollLock } from "../hooks/useScrollLock";
import WishlistButton from "../components/WishlistButton";

const ProductDetail = () => {
  const { productId } = useParams();
  const { addItem, mutating, error: cartError } = useCart();
  const [result, setResult] = useState({
    id: null,
    product: null,
    error: false,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [buyBarVisible, setBuyBarVisible] = useState(false);
  const buyButtonRef = useRef(null);
  const loading = result.id !== `${productId}:${retryCount}`;
  const product = loading ? null : result.product;
  const error = !loading && result.error;
  const images = product?.images?.filter((image) => image.url) || [];
  const stock = Number(product?.stock) || 0;
  const attributes = product?.attributes
    ? Object.entries(
        product.attributes instanceof Map
          ? Object.fromEntries(product.attributes)
          : product.attributes,
      )
    : [];

  // The zoom viewer is a full-screen overlay, so the page behind it must not
  // scroll on touch devices.
  useScrollLock(imageViewerOpen);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = `${productId}:${retryCount}`;
    api
      .get(`/api/products/product/${productId}`, { signal: controller.signal })
      .then(({ data }) => {
        if (!data?._id) throw new Error("Product was not found");
        setResult({ id: requestId, product: data, error: false });
        setActiveImage(0);
        setQuantity(1);
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED")
          setResult({ id: requestId, product: null, error: true });
      });
    return () => controller.abort();
  }, [productId, retryCount]);

  useEffect(() => {
    const target = buyButtonRef.current;
    if (!target || !product) {
      setBuyBarVisible(false);
      return undefined;
    }
    // Only show the mobile bar once the real Add to cart button has left the
    // viewport, so the user never sees two identical buttons at once.
    const observer = new IntersectionObserver(
      ([entry]) => setBuyBarVisible(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [product]);

  useEffect(() => {
    if (!imageViewerOpen) return undefined;

    const handleViewerKeyDown = (event) => {
      if (event.key === "Escape") setImageViewerOpen(false);
      if (event.key === "ArrowLeft") {
        setActiveImage((index) => (index - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight") {
        setActiveImage((index) => (index + 1) % images.length);
      }
      if (event.key === "+" || event.key === "=") {
        setZoomLevel((zoom) => Math.min(3, zoom + 0.5));
      }
      if (event.key === "-") {
        setZoomLevel((zoom) => Math.max(1, zoom - 0.5));
      }
    };

    window.addEventListener("keydown", handleViewerKeyDown);
    return () => window.removeEventListener("keydown", handleViewerKeyDown);
  }, [imageViewerOpen, images.length]);

  const changeImage = (direction) => {
    setActiveImage(
      (index) => (index + direction + images.length) % images.length,
    );
  };

  const openImageViewer = () => {
    setZoomLevel(1);
    setImageViewerOpen(true);
  };

  const addProduct = async () => {
    if (!product || stock < 1) return;
    const addedToCart = await addItem(product, quantity);
    if (!addedToCart) return;
    setAdded(true);
  };

  if (loading) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center gap-3 bg-white text-sm text-neutral-500">
        <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
        Loading product details
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="flex min-h-[65vh] flex-col items-center justify-center px-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
          Product details
        </p>
        <h1 className="mt-3 text-3xl font-medium text-neutral-950">
          We couldn’t find that piece.
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          It may have been removed or the link may be incorrect.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 text-sm font-medium hover:border-neutral-950"
          >
            Try again <RotateCw size={14} aria-hidden="true" />
          </button>
          <Link
            to="/collection"
            className="inline-flex min-h-11 items-center gap-2 bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-amber-700"
          >
            Browse collection <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      {/*
        The sticky purchase bar is `fixed` on mobile, so the page needs bottom
        padding to stop it covering the last of the content and the footer.
      */}
      <div
        className={`mx-auto max-w-360 px-5 pt-6 sm:px-8 lg:px-12 lg:pb-24 ${
          stock > 0 ? "pb-28 lg:pb-24" : "pb-16"
        }`}
      >
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-2 text-xs text-neutral-500"
        >
          <Link to="/" className="hover:text-neutral-950">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/collection" className="hover:text-neutral-950">
            Collection
          </Link>
          <span aria-hidden="true">/</span>
          <span className="max-w-[45vw] truncate text-neutral-900">
            {product.name}
          </span>
        </nav>

        <div className="grid gap-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:gap-16">
          <section
            aria-label="Product images"
            className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[76px_minmax(0,1fr)] sm:items-start"
          >
            <div className="group relative aspect-4/5 overflow-hidden bg-[#f3f2ee] sm:col-start-2 sm:row-start-1 sm:aspect-square">
              {images.length ? (
                <button
                  type="button"
                  onClick={openImageViewer}
                  aria-label="Open product image zoom viewer"
                  className="absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-neutral-950"
                >
                  <img
                    src={images[Math.min(activeImage, images.length - 1)]?.url}
                    alt={`${product.name}, image ${activeImage + 1} of ${images.length}`}
                    fetchPriority="high"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025] motion-reduce:transition-none"
                  />
                </button>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                  Product image coming soon
                </div>
              )}
              {product.isBestSeller && (
                <span className="pointer-events-none absolute left-4 top-4 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest">
                  Best seller
                </span>
              )}
              {images.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={openImageViewer}
                    aria-label="Zoom product image"
                    className="absolute right-4 top-4 inline-flex size-10 items-center justify-center border border-white/70 bg-white/90 text-neutral-900 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 focus:opacity-100 max-sm:opacity-100"
                  >
                    <Expand size={16} aria-hidden="true" />
                  </button>
                  {images.length > 1 && (
                    <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
                      <button
                        type="button"
                        aria-label="Previous product image"
                        onClick={() => changeImage(-1)}
                        className="inline-flex size-10 items-center justify-center border border-white/70 bg-white/90 text-neutral-900 shadow-sm hover:bg-white"
                      >
                        <ChevronLeft size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next product image"
                        onClick={() => changeImage(1)}
                        className="inline-flex size-10 items-center justify-center border border-white/70 bg-white/90 text-neutral-900 shadow-sm hover:bg-white"
                      >
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  <span className="pointer-events-none absolute bottom-4 right-4 bg-neutral-950/75 px-2.5 py-1.5 text-[11px] tabular-nums text-white">
                    {String(activeImage + 1).padStart(2, "0")} /{" "}
                    {String(images.length).padStart(2, "0")}
                  </span>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div
                className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 sm:col-start-1 sm:row-start-1 sm:mt-0 sm:max-h-160 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:pr-1"
                role="group"
                aria-label="Choose product image"
              >
                {images.map((image, index) => (
                  <button
                    key={image.public_id || image.url}
                    type="button"
                    aria-label={`Show product image ${index + 1}`}
                    aria-pressed={activeImage === index}
                    onClick={() => setActiveImage(index)}
                    className={`size-17 shrink-0 snap-start overflow-hidden border-2 transition-colors ${activeImage === index ? "border-neutral-950" : "border-transparent opacity-70 hover:border-neutral-400 hover:opacity-100"}`}
                  >
                    <img
                      src={image.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="lg:sticky lg:top-40 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              {product.category}
            </p>
            <h1 className="mt-3 max-w-xl text-3xl font-medium leading-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-4 text-xl font-medium tabular-nums">
              {formatPrice(product.price)}
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm">
              {stock > 0 ? (
                <>
                  <span className="size-2 rounded-full bg-emerald-600" />
                  <span className="text-neutral-700">In stock</span>
                </>
              ) : (
                <>
                  <span className="size-2 rounded-full bg-neutral-400" />
                  <span className="text-neutral-600">
                    Currently unavailable
                  </span>
                </>
              )}
            </div>

            <p className="mt-6 max-w-xl text-sm leading-7 text-neutral-600">
              {product.description}
            </p>

            {/* Always available, even when sold out — you can still save it. */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <WishlistButton
                product={product}
                variant="detail"
                showLabel
              />
              <Link
                to="/wishlist"
                className="text-xs text-neutral-500 underline underline-offset-4 hover:text-amber-800"
              >
                View saved items
              </Link>
            </div>

            {stock > 0 && (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <div className="inline-flex h-12 w-fit items-center border border-neutral-300">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                    onClick={() =>
                      setQuantity((value) => Math.max(1, value - 1))
                    }
                    className="inline-flex size-11 items-center justify-center text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
                  >
                    <Minus size={15} aria-hidden="true" />
                  </button>
                  <span
                    aria-live="polite"
                    className="w-9 text-center text-sm tabular-nums"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={quantity >= stock}
                    onClick={() =>
                      setQuantity((value) => Math.min(stock, value + 1))
                    }
                    className="inline-flex size-11 items-center justify-center text-neutral-700 hover:bg-neutral-100 disabled:opacity-40"
                  >
                    <Plus size={15} aria-hidden="true" />
                  </button>
                </div>
                <button
                  ref={buyButtonRef}
                  type="button"
                  onClick={addProduct}
                  disabled={mutating}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-neutral-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:cursor-wait disabled:opacity-70"
                >
                  {mutating && (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {added ? (
                    <>
                      <Check size={16} aria-hidden="true" /> Add another
                    </>
                  ) : (
                    "Add to cart"
                  )}
                </button>
              </div>
            )}

            {/* Inline so a failed add is visible where the user pressed the
                button, instead of as a floating toast. */}
            {cartError && (
              <p
                role="alert"
                className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800"
              >
                {cartError}
              </p>
            )}

            <div className="mt-7 grid gap-3 border-y border-neutral-200 py-5 sm:grid-cols-2">
              <p className="flex items-center gap-2 text-xs leading-5 text-neutral-600">
                <Truck
                  size={16}
                  className="shrink-0 text-neutral-800"
                  aria-hidden="true"
                />{" "}
                Complimentary shipping over $75
              </p>
              <p className="flex items-center gap-2 text-xs leading-5 text-neutral-600">
                <ShieldCheck
                  size={16}
                  className="shrink-0 text-neutral-800"
                  aria-hidden="true"
                />{" "}
                Secure checkout
              </p>
            </div>

            <div className="mt-2 divide-y divide-neutral-200 border-b border-neutral-200">
              <details open className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                  Product details{" "}
                  <Plus
                    size={15}
                    className="transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pt-3 text-sm leading-6 text-neutral-600">
                  {product.description}
                </p>
              </details>
              {attributes.length > 0 && (
                <details className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                    Specifications{" "}
                    <Plus
                      size={15}
                      className="transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    />
                  </summary>
                  <dl className="grid grid-cols-2 gap-x-5 gap-y-3 pt-4 text-sm">
                    {attributes.map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-neutral-500">{label}</dt>
                        <dd className="mt-1 text-neutral-900">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </div>

            <Link
              to="/collection"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
            >
              <ArrowLeft size={15} aria-hidden="true" /> Continue browsing
            </Link>
          </section>
        </div>
      </div>

      {/*
        Sticky purchase bar. On a long product page the real Add to cart button
        sits high up and is easy to lose, especially on mobile. This only
        appears once that button has scrolled away, and is hidden on desktop
        where the purchase panel is already sticky in view.
      */}
      {stock > 0 && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-sm transition-transform duration-200 lg:hidden ${
            buyBarVisible ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto flex max-w-360 items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-neutral-500">{product.name}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-neutral-950">
                {formatPrice(product.price)}
              </p>
            </div>
            <button
              type="button"
              onClick={addProduct}
              disabled={mutating}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 bg-neutral-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-wait disabled:opacity-70"
            >
              {mutating && (
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                  aria-hidden="true"
                />
              )}
              {added ? "Add another" : "Add to cart"}
            </button>
          </div>
        </div>
      )}
      {imageViewerOpen && images.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image viewer`}
          className="fixed inset-0 z-100 flex items-center justify-center bg-neutral-950/95 p-4 text-white sm:p-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) setImageViewerOpen(false);
          }}
        >
          <button
            type="button"
            aria-label="Close image viewer"
            onClick={() => setImageViewerOpen(false)}
            className="absolute right-4 top-4 inline-flex size-11 items-center justify-center border border-white/25 text-white transition-colors hover:bg-white/10 sm:right-7 sm:top-7"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <div className="absolute left-4 top-5 text-xs text-white/70 sm:left-7 sm:top-8">
            <p className="max-w-[50vw] truncate font-medium text-white">
              {product.name}
            </p>
            <p className="mt-1 tabular-nums">
              {activeImage + 1} / {images.length}
            </p>
          </div>
          <div className="absolute right-16 top-4 flex items-center gap-1 sm:right-24 sm:top-7">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoomLevel <= 1}
              onClick={() => setZoomLevel((zoom) => Math.max(1, zoom - 0.5))}
              className="inline-flex size-11 items-center justify-center border border-white/25 text-white transition-colors hover:bg-white/10 disabled:opacity-35"
            >
              <Minus size={17} aria-hidden="true" />
            </button>
            <span className="w-12 text-center text-xs tabular-nums text-white/75">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoomLevel >= 3}
              onClick={() => setZoomLevel((zoom) => Math.min(3, zoom + 0.5))}
              className="inline-flex size-11 items-center justify-center border border-white/25 text-white transition-colors hover:bg-white/10 disabled:opacity-35"
            >
              <Plus size={17} aria-hidden="true" />
            </button>
          </div>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous product image"
                onClick={() => changeImage(-1)}
                className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-neutral-950/40 text-white transition-colors hover:bg-white/10 sm:left-7 sm:size-12"
              >
                <ChevronLeft size={21} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next product image"
                onClick={() => changeImage(1)}
                className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-neutral-950/40 text-white transition-colors hover:bg-white/10 sm:right-7 sm:size-12"
              >
                <ChevronRight size={21} aria-hidden="true" />
              </button>
            </>
          )}
          <div className="flex h-full w-full items-center justify-center overflow-auto py-14 sm:py-12">
            <img
              src={images[Math.min(activeImage, images.length - 1)]?.url}
              alt={`${product.name}, enlarged view`}
              onClick={() => setZoomLevel((zoom) => (zoom === 1 ? 2 : 1))}
              className="max-h-full max-w-full cursor-zoom-in object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel})` }}
            />
          </div>
          <p className="absolute bottom-5 text-center text-[11px] text-white/55">
            Use + and − to zoom · arrow keys to change image · Esc to close
          </p>
        </div>
      )}
    </main>
  );
};

export default ProductDetail;
