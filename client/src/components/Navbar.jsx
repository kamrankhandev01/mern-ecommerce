import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Heart,
  LoaderCircle,
  LogOut,
  Menu,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import { resetCartError } from "../redux/cartSlice";
import { clearUser } from "../redux/userSlice";
import ProductSearch from "./ProductSearch";
import AnnouncementBar from "./AnnouncementBar";

const Navbar = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const {
    items: cartItems,
    count: cartCount,
    totals,
    isSignedIn,
    mutating,
    error: cartError,
    setQuantity,
    removeItem,
  } = useCart();
  const wishlistCount = useWishlist().count;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const closePanels = () => {
    setMobileMenuOpen(false);
    setAccountOpen(false);
    setCartOpen(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await api.post("/api/auth/logout");
      dispatch(clearUser());
      closePanels();
    } catch (error) {
      setLogoutError(
        error.response?.data?.message ||
          "Unable to sign out. Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white text-neutral-950 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <AnnouncementBar />

      <div className="mx-auto flex max-w-360 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
        <button
          type="button"
          aria-label={
            mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex size-10 items-center justify-center lg:hidden"
        >
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <Link
          to="/"
          onClick={closePanels}
          className="shrink-0 text-[25px] font-semibold leading-none tracking-[-0.04em]"
        >
          astra<span className="text-amber-600">.</span>
        </Link>

        <ProductSearch onNavigate={closePanels} />

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <div className="relative">
            <button
              type="button"
              aria-label={
                user ? `Account for ${user.name}` : "Open account menu"
              }
              aria-expanded={accountOpen}
              onClick={() => {
                setAccountOpen(!accountOpen);
                setCartOpen(false);
                setLogoutError("");
              }}
              className="inline-flex size-10 items-center justify-center transition-colors hover:text-amber-700"
            >
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt=""
                  className="size-7 rounded-full object-cover"
                />
              ) : (
                <UserRound size={20} strokeWidth={1.7} aria-hidden="true" />
              )}
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-12 z-40 w-72 border border-neutral-200 bg-white p-5 shadow-xl">
                {user ? (
                  <>
                    <p className="text-sm font-semibold">
                      Welcome, {user.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {user.email}
                    </p>
                    <Link
                      to="/account"
                      onClick={closePanels}
                      className="mt-4 flex min-h-10 items-center justify-between border-y border-neutral-200 text-sm font-medium"
                    >
                      Manage account <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <Link
                      to="/orders"
                      onClick={closePanels}
                      className="mt-3 flex min-h-9 items-center justify-between text-sm text-neutral-700 hover:text-neutral-950"
                    >
                      Your orders <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={closePanels}
                      className="mt-2 flex min-h-9 items-center justify-between text-sm text-neutral-700 hover:text-neutral-950"
                    >
                      Your wishlist{" "}
                      {wishlistCount > 0 && (
                        <span className="text-xs text-neutral-500 tabular-nums">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={closePanels}
                        className="mt-2 flex min-h-9 items-center justify-between text-sm font-medium text-amber-800 hover:text-amber-950"
                      >
                        Store console{" "}
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    )}
                    {logoutError && (
                      <p role="alert" className="mt-3 text-xs text-red-700">
                        {logoutError}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={loggingOut}
                      onClick={handleLogout}
                      className="mt-4 inline-flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-950 disabled:opacity-60"
                    >
                      <LogOut size={15} aria-hidden="true" />
                      {loggingOut ? "Signing out…" : "Sign out"}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold">Your account</p>
                    <p className="mt-2 text-sm leading-5 text-neutral-600">
                      Sign in or create an account to keep your details
                      together.
                    </p>
                    <Link
                      to="/account"
                      onClick={closePanels}
                      className="mt-4 flex min-h-11 items-center justify-center gap-2 bg-neutral-950 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                    >
                      Sign in <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <Link
                      to="/account"
                      onClick={closePanels}
                      className="mt-3 block text-center text-xs text-neutral-600 underline underline-offset-4"
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`}
              onClick={closePanels}
              className="inline-flex size-10 items-center justify-center transition-colors hover:text-amber-700"
            >
              <Heart size={20} strokeWidth={1.7} aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className="absolute right-0 top-0 flex size-4.25 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-neutral-950">
                  {wishlistCount}
                </span>
              )}
            </Link>
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label={`Shopping cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
              aria-expanded={cartOpen}
              onClick={() => {
                setCartOpen(!cartOpen);
                setAccountOpen(false);
              }}
              className="inline-flex size-10 items-center justify-center transition-colors hover:text-amber-700"
            >
              <ShoppingBag size={20} strokeWidth={1.7} aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex size-4.25 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-neutral-950">
                  {cartCount}
                </span>
              )}
            </button>
            {cartOpen && (
              <div className="absolute right-0 top-12 z-40 w-72 border border-neutral-200 bg-white p-5 shadow-xl sm:w-80">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Your cart</p>
                  <span className="text-xs text-neutral-500">
                    {cartCount} {cartCount === 1 ? "item" : "items"}
                  </span>
                </div>

                {!isSignedIn && cartItems.length > 0 && (
                  <p className="mt-3 border border-amber-200 bg-amber-50 p-2 text-[11px] leading-4 text-amber-950">
                    <Link
                      to="/account"
                      onClick={closePanels}
                      className="font-semibold underline underline-offset-2"
                    >
                      Sign in
                    </Link>{" "}
                    to keep this cart — it merges automatically when you do.
                  </p>
                )}

                {cartError && (
                  <p
                    role="alert"
                    className="mt-3 flex items-start justify-between gap-2 border border-red-200 bg-red-50 p-2 text-[11px] leading-4 text-red-800"
                  >
                    <span>{cartError}</span>
                    <button
                      type="button"
                      aria-label="Dismiss"
                      onClick={() => dispatch(resetCartError())}
                      className="shrink-0 text-red-700 hover:text-red-900"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </p>
                )}

                {cartItems.length === 0 ? (
                  <>
                    <p className="py-8 text-center text-sm text-neutral-600">
                      Your cart is waiting for something good.
                    </p>
                    <Link
                      to="/collection"
                      onClick={closePanels}
                      className="flex h-11 items-center justify-center gap-2 bg-neutral-950 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                    >
                      Explore the shop{" "}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </>
                ) : (
                  <>
                    <ul className="my-4 max-h-72 space-y-4 overflow-y-auto">
                      {cartItems.map((item) => (
                        <li key={item.productId} className="flex gap-3">
                          <div className="size-14 shrink-0 overflow-hidden bg-neutral-100">
                            {item.image && (
                              <img
                                src={item.image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {item.name}
                            </p>
                            <p className="mt-1 text-[11px] text-neutral-500">
                              {formatPrice(item.price)} ·{" "}
                              {formatPrice(item.price * item.quantity)}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Decrease ${item.name} quantity`}
                                disabled={mutating}
                                onClick={() =>
                                  setQuantity(item.productId, item.quantity - 1)
                                }
                                className="inline-flex size-6 items-center justify-center border border-neutral-200 text-neutral-600 hover:border-neutral-950 disabled:opacity-40"
                              >
                                <Minus size={11} aria-hidden="true" />
                              </button>
                              <span className="w-5 text-center text-[11px] tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label={`Increase ${item.name} quantity`}
                                disabled={
                                  mutating || item.quantity >= item.stock
                                }
                                onClick={() =>
                                  setQuantity(item.productId, item.quantity + 1)
                                }
                                className="inline-flex size-6 items-center justify-center border border-neutral-200 text-neutral-600 hover:border-neutral-950 disabled:opacity-40"
                              >
                                <Plus size={11} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Remove ${item.name}`}
                                disabled={mutating}
                                onClick={() => removeItem(item.productId)}
                                className="ml-auto inline-flex size-6 items-center justify-center text-neutral-400 hover:text-red-700 disabled:opacity-40"
                              >
                                <Trash2 size={12} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between border-t border-neutral-200 pt-3 text-sm font-semibold">
                      <span>Subtotal</span>
                      <span>{formatPrice(totals.subtotal)}</span>
                    </div>
                    <p className="mt-2 flex items-center gap-2 text-[11px] leading-4 text-neutral-500">
                      {mutating && (
                        <LoaderCircle
                          size={12}
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      )}
                      {totals.shipping === 0
                        ? "Complimentary shipping on this order."
                        : `${formatPrice(totals.shipping)} shipping · free over ${formatPrice(totals.freeShippingThreshold)}.`}
                    </p>
                    <Link
                      to="/checkout"
                      onClick={closePanels}
                      className="mt-4 flex h-11 items-center justify-center gap-2 bg-neutral-950 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                    >
                      Continue to checkout{" "}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProductSearch mobile onNavigate={closePanels} />

      <nav
        aria-label="Main navigation"
        className="hidden border-y border-neutral-200 lg:block"
      >
        <div className="mx-auto flex h-12 max-w-360 items-center justify-center gap-10 px-10 text-[13px] font-medium">
          <Link
            to="/collection"
            className="transition-colors hover:text-amber-700"
          >
            Collection
          </Link>
          <Link
            to="/#best-sellers"
            className="transition-colors hover:text-amber-700"
          >
            Best sellers
          </Link>
          <Link
            to="/collection?sort=newest"
            className="transition-colors hover:text-amber-700"
          >
            New arrivals
          </Link>
          <Link
            to="/about"
            className="transition-colors hover:text-amber-700"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="transition-colors hover:text-amber-700"
          >
            Contact
          </Link>
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="font-semibold text-amber-800 transition-colors hover:text-amber-950"
            >
              Admin dashboard
            </Link>
          )}
        </div>
      </nav>

      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="absolute inset-x-0 top-full z-30 border-t border-neutral-200 bg-white px-5 py-4 shadow-lg lg:hidden"
        >
          <div className="flex flex-col">
            <Link
              to="/collection"
              onClick={closePanels}
              className="border-b border-neutral-100 py-4 text-sm font-medium"
            >
              Collection
            </Link>
            <Link
              to="/#best-sellers"
              onClick={closePanels}
              className="border-b border-neutral-100 py-4 text-sm font-medium"
            >
              Best sellers
            </Link>
            <Link
              to="/collection?sort=newest"
              onClick={closePanels}
              className="border-b border-neutral-100 py-4 text-sm font-medium"
            >
              New arrivals
            </Link>
            <Link
              to="/about"
              onClick={closePanels}
              className="border-b border-neutral-100 py-4 text-sm font-medium"
            >
              About
            </Link>
            <Link
              to="/contact"
              onClick={closePanels}
              className="py-4 text-sm font-medium"
            >
              Contact
            </Link>
            {user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={closePanels}
                className="border-t border-neutral-100 py-4 text-sm font-semibold text-amber-800"
              >
                Admin dashboard
              </Link>
            )}
            <Link
              to="/account"
              onClick={closePanels}
              className="border-t border-neutral-100 py-4 text-sm font-medium"
            >
              {user ? "Your account" : "Sign in / Create account"}
            </Link>
            {user && (
              <Link
                to="/orders"
                onClick={closePanels}
                className="border-b border-neutral-100 py-4 text-sm font-medium"
              >
                Your orders
              </Link>
            )}
            <Link
              to="/wishlist"
              onClick={closePanels}
              className="border-b border-neutral-100 py-4 text-sm font-medium"
            >
              Wishlist
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
