import { useWishlist } from "../hooks/useWishlist";

/**
 * The save-for-later heart.
 *
 * Feedback is the icon itself filling in and the count changing — there is no
 * toast. Failures surface through `wishlist.error`, which the page renders
 * inline, so a failed save is never silent.
 */
const WishlistButton = ({
  product,
  variant = "overlay",
  className = "",
  showLabel = false,
}) => {
  const { isSaved, toggle, mutating, isSignedIn } = useWishlist();
  const saved = isSaved(product);

  const base =
    "inline-flex items-center justify-center transition-colors disabled:cursor-wait disabled:opacity-60";

  const styles =
    variant === "overlay"
      ? `absolute right-3 top-3 size-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm hover:bg-white ${saved ? "text-red-600" : "text-neutral-700 hover:text-red-600"}`
      : variant === "detail"
        ? `inline-flex min-h-12 items-center gap-2 border px-5 text-sm font-medium ${saved ? "border-red-300 bg-red-50 text-red-700" : "border-neutral-300 text-neutral-800 hover:border-neutral-950"}`
        : `min-h-9 items-center gap-1.5 border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:border-neutral-950 ${saved ? "border-red-300 bg-red-50 text-red-700" : ""}`;

  const label = saved
    ? "Remove from wishlist"
    : `Save ${product?.name || "this item"} for later`;

  return (
    <button
      type="button"
      onClick={(event) => {
        // Product cards are wrapped in a link — never navigate when saving.
        event.preventDefault();
        event.stopPropagation();
        toggle(product);
      }}
      disabled={mutating}
      aria-pressed={saved}
      aria-label={label}
      title={isSignedIn ? label : `${label} (sign in to sync)`}
      className={`${base} ${styles} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width={variant === "overlay" ? 15 : 16}
        height={variant === "overlay" ? 15 : 16}
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21.2l7.7-7.8 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      {showLabel && (saved ? "Saved" : "Save for later")}
    </button>
  );
};

export default WishlistButton;
