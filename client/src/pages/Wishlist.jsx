import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  ArrowRight,
  Heart,
  LoaderCircle,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useWishlist } from "../hooks/useWishlist";
import { useCart } from "../hooks/useCart";
import { formatPrice } from "../lib/format";
import { resetWishlistError } from "../redux/wishlistSlice";

const Wishlist = () => {
  const dispatch = useDispatch();
  const { items, count, loading, error, remove, clear, isSignedIn } =
    useWishlist();
  const { addItem, mutating: cartMutating } = useCart();
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  const moveToCart = async (item) => {
    setBusyId(item.productId);
    setNotice("");
    // addItem expects a product-shaped object; the wishlist row already has one.
    const added = await addItem(
      {
        ...item,
        _id: item.productId,
        images: item.image ? [{ url: item.image }] : [],
      },
      1,
    );
    if (added) {
      await remove(item);
      setNotice(`Moved “${item.name}” to your cart.`);
    } else {
      setNotice(
        "Could not move that to your cart. Your wishlist is unchanged.",
      );
    }
    setBusyId("");
  };

  const removeOne = async (item) => {
    setBusyId(item.productId);
    setNotice("");
    await remove(item);
    setBusyId("");
  };

  const clearAll = async () => {
    setNotice("");
    await clear();
  };

  return (
    <main className="min-h-[70vh] bg-white">
      <section className="border-b border-neutral-200 bg-[#f4f3ef] px-5 py-12 sm:px-8 sm:py-14 lg:px-12">
        <div className="mx-auto flex max-w-360 flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-amber-800 uppercase">
              Astra / Wishlist
            </p>
            <h1 className="mt-3 text-4xl font-medium">Saved for later</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-neutral-600">
              Pieces you are not ready to commit to. They stay here until you
              move them to your cart or decide they are not for you.
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start border border-neutral-300 px-4 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-950 sm:self-auto"
            >
              <Trash2 size={15} aria-hidden="true" />
              Clear all
            </button>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-360 px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
        {!isSignedIn && (
          <p className="mb-6 border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
            <Link
              to="/account"
              className="font-semibold underline underline-offset-2"
            >
              Sign in
            </Link>{" "}
            to keep this wishlist on all your devices — it saves automatically
            when you do.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => dispatch(resetWishlistError())}
              aria-label="Dismiss"
              className="shrink-0 text-red-700 hover:text-red-900"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </p>
        )}

        {notice && (
          <p className="mb-6 border border-neutral-300 bg-[#faf9f6] px-4 py-3 text-sm text-neutral-800">
            {notice}
          </p>
        )}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-neutral-500">
            <LoaderCircle
              size={18}
              className="animate-spin"
              aria-hidden="true"
            />
            Loading your wishlist
          </div>
        ) : items.length === 0 ? (
          <EmptyWishlist />
        ) : (
          <WishlistRows
            items={items}
            count={count}
            busyId={busyId}
            cartMutating={cartMutating}
            onMove={moveToCart}
            onRemove={removeOne}
          />
        )}
      </section>
    </main>
  );
};

export default Wishlist;

const EmptyWishlist = () => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-[#faf9f6] px-6 py-16 text-center">
    <span className="flex size-12 items-center justify-center rounded-full bg-white text-neutral-400">
      <Heart size={22} aria-hidden="true" />
    </span>
    <h2 className="mt-5 text-2xl font-medium text-neutral-950">
      Nothing saved yet
    </h2>
    <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600">
      Tap the heart on any product to keep it here while you think about it.
    </p>
    <Link
      to="/collection"
      className="mt-6 inline-flex min-h-12 items-center gap-2 bg-neutral-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
    >
      Explore the collection <ArrowRight size={16} aria-hidden="true" />
    </Link>
  </div>
);

const WishlistRows = ({
  items,
  count,
  busyId,
  cartMutating,
  onMove,
  onRemove,
}) => (
  <>
    <p className="mb-5 text-sm text-neutral-500">
      {count} {count === 1 ? "item" : "items"} saved
    </p>
    <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
      {items.map((item) => (
        <li
          key={item.productId}
          className="flex items-center gap-4 py-4 sm:gap-6"
        >
          <Link
            to={`/product/${item.productId}`}
            className="size-20 shrink-0 overflow-hidden bg-neutral-100 sm:size-28"
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-[10px] text-neutral-400">
                No image
              </span>
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              to={`/product/${item.productId}`}
              className="block truncate text-sm font-medium text-neutral-950 hover:underline"
            >
              {item.name}
            </Link>
            <p className="mt-1 text-xs text-neutral-500">{item.category}</p>
            <p className="mt-1.5 text-sm text-neutral-900">
              {formatPrice(item.price)}
            </p>
            {!item.inStock && (
              <p className="mt-1.5 text-xs font-medium text-amber-800">
                Currently sold out — we will keep it here for you.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => onMove(item)}
              disabled={busyId === item.productId || cartMutating}
              className="inline-flex min-h-10 items-center gap-1.5 bg-neutral-950 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
            >
              {busyId === item.productId ? (
                <LoaderCircle
                  size={14}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ShoppingBag size={14} aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Move to cart</span>
              <span className="sm:hidden">To cart</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(item)}
              disabled={busyId === item.productId}
              aria-label={`Remove ${item.name} from wishlist`}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-red-700 disabled:opacity-60"
            >
              <Trash2 size={13} aria-hidden="true" />
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  </>
);
