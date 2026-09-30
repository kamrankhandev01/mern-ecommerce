import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CreditCard,
  LoaderCircle,
  Minus,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";
import api from "../lib/api";
import { formatPrice } from "../lib/format";
import { useCart } from "../hooks/useCart";

const Checkout = () => {
  const user = useSelector((state) => state.user.user);
  const {
    items,
    totals,
    isEmpty,
    setQuantity,
    removeItem,
    refresh,
    mutating,
  } = useCart();
  const navigate = useNavigate();
  // Contact fields are seeded from the profile and may be edited freely; a
  // separate draft object keeps typing from fighting the profile default.
  const [contactDraft, setContactDraft] = useState(null);
  const address = {
    fullName: contactDraft?.fullName ?? user?.name ?? "",
    email: contactDraft?.email ?? user?.email ?? "",
    phone: contactDraft?.phone ?? "",
    addressLine1: contactDraft?.addressLine1 ?? "",
    addressLine2: contactDraft?.addressLine2 ?? "",
    city: contactDraft?.city ?? "",
    region: contactDraft?.region ?? "",
    postalCode: contactDraft?.postalCode ?? "",
    country: contactDraft?.country ?? "",
  };
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(false);
  const subtotal = totals.subtotal;
  const shipping = totals.shipping;

  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/api/orders/payment-options", { signal: controller.signal })
      .then(({ data }) => {
        const methods = Array.isArray(data.methods) ? data.methods : [];
        setPaymentMethods(methods);
        setOnlinePaymentsEnabled(Boolean(data.onlinePaymentsEnabled));
        setPaymentMethod((current) => current || methods[0]?.id || "");
      })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(
            requestError.response?.data?.message ||
              "Payment options could not be loaded. Refresh and try again.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPaymentMethods(false);
      });
    return () => controller.abort();
  }, []);

  const updateAddress = (event) => {
    const { name, value } = event.target;
    // Seed the draft from the resolved values the first time a field changes.
    setContactDraft((current) => ({ ...address, ...current, [name]: value }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (!user) return;
    if (isEmpty) {
      setError("Your cart is empty.");
      return;
    }
    setPending(true);
    setError("");
    try {
      // `fromCart` makes the server price the order from the stored cart.
      const { data } = await api.post("/api/orders", {
        shippingAddress: address,
        paymentMethod,
        fromCart: true,
      });
      if (!data.success || !data.order?._id) {
        throw new Error(data.message || "We could not place your order.");
      }
      if (paymentMethod !== "offline") {
        if (!data.checkoutUrl) {
          throw new Error(
            "The payment provider did not return a checkout link.",
          );
        }
        window.location.assign(data.checkoutUrl);
        return;
      }
      // The server empties the cart once an offline order is recorded.
      await refresh();
      navigate(`/orders/${data.order._id}`, {
        replace: true,
        state: { justPlaced: true },
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "We could not place your order. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  if (!user) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#f4f3ef] px-5">
        <section className="w-full max-w-lg border border-neutral-200 bg-white p-8 text-center sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Checkout
          </p>
          <h1 className="mt-3 text-3xl font-medium">Sign in to continue.</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Your cart will be waiting when you return.
          </p>
          <Link
            to="/account"
            state={{ from: "/checkout" }}
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 bg-neutral-950 px-6 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Sign in <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center px-5">
        <section className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Your cart
          </p>
          <h1 className="mt-3 text-3xl font-medium">
            Nothing to check out yet.
          </h1>
          <Link
            to="/collection"
            className="mt-6 inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 text-sm font-medium hover:border-neutral-950"
          >
            Explore the collection <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f3ef] px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-360">
        <Link
          to="/collection"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-950"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Continue shopping
        </Link>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-12">
          <section className="border border-neutral-200 bg-white p-5 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Astra / Checkout
            </p>
            <h1 className="mt-2 text-3xl font-medium">Delivery details</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Where should we send your order?
            </p>

            <form
              id="checkout-form"
              onSubmit={submitOrder}
              className="mt-8 space-y-7"
            >
              <fieldset>
                <legend className="text-sm font-semibold text-neutral-950">
                  Contact
                </legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-medium text-neutral-700">
                    Full name
                    <input
                      name="fullName"
                      autoComplete="name"
                      required
                      maxLength={100}
                      value={address.fullName}
                      onChange={updateAddress}
                      className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                    />
                  </label>
                  <label className="text-xs font-medium text-neutral-700">
                    Email address
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={address.email}
                      onChange={updateAddress}
                      className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                    />
                  </label>
                  <label className="text-xs font-medium text-neutral-700 sm:col-span-2">
                    Phone number
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      maxLength={32}
                      value={address.phone}
                      onChange={updateAddress}
                      className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="border-t border-neutral-200 pt-6">
                <legend className="text-sm font-semibold text-neutral-950">
                  Shipping address
                </legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-medium text-neutral-700 sm:col-span-2">
                    Address line 1
                    <input
                      name="addressLine1"
                      autoComplete="address-line1"
                      required
                      maxLength={160}
                      value={address.addressLine1}
                      onChange={updateAddress}
                      className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                    />
                  </label>
                  <label className="text-xs font-medium text-neutral-700 sm:col-span-2">
                    Address line 2{" "}
                    <span className="font-normal text-neutral-400">
                      Optional
                    </span>
                    <input
                      name="addressLine2"
                      autoComplete="address-line2"
                      maxLength={160}
                      value={address.addressLine2}
                      onChange={updateAddress}
                      className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                    />
                  </label>
                  <label className="text-xs font-medium text-neutral-700">
                    City
                    <input
                      name="city"
                      autoComplete="address-level2"
                      required
                      maxLength={100}
                      value={address.city}
                      onChange={updateAddress}
                      className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                    />
                  </label>
                  <label className="text-xs font-medium text-neutral-700">
                    State / region
                    <input
                      name="region"
                      autoComplete="address-level1"
                      required
                      maxLength={100}
                      value={address.region}
                      onChange={updateAddress}
                      className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                    />
                  </label>
                  <label className="text-xs font-medium text-neutral-700">
                    Postal code
                    <input
                      name="postalCode"
                      autoComplete="postal-code"
                      required
                      maxLength={24}
                      value={address.postalCode}
                      onChange={updateAddress}
                      className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                    />
                  </label>
                  <label className="text-xs font-medium text-neutral-700">
                    Country
                    <input
                      name="country"
                      autoComplete="country-name"
                      required
                      maxLength={80}
                      value={address.country}
                      onChange={updateAddress}
                      className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-950"
                    />
                  </label>
                </div>
              </fieldset>

              <div className="border-t border-neutral-200 pt-6">
                <p className="text-sm font-semibold text-neutral-950">
                  Payment
                </p>
                {!loadingPaymentMethods && !onlinePaymentsEnabled && (
                  <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                    Online card payments are not configured on this server yet,
                    so only offline payment is available. Add your Stripe or
                    Safepay keys to enable card checkout.
                  </p>
                )}
                {loadingPaymentMethods ? (
                  <p
                    role="status"
                    className="mt-3 flex items-center gap-2 text-sm text-neutral-500"
                  >
                    <LoaderCircle
                      size={15}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    Loading payment methods
                  </p>
                ) : (
                  <fieldset className="mt-3 space-y-2">
                    <legend className="sr-only">Choose payment method</legend>
                    {paymentMethods.map((method) => {
                      const Icon =
                        method.id === "offline" ? Banknote : CreditCard;
                      return (
                        <label
                          key={method.id}
                          className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${paymentMethod === method.id ? "border-neutral-950 bg-[#faf9f6]" : "border-neutral-200 hover:border-neutral-400"}`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            required
                            value={method.id}
                            checked={paymentMethod === method.id}
                            onChange={() => {
                              setPaymentMethod(method.id);
                              setError("");
                            }}
                            className="mt-1 size-4 accent-amber-700"
                          />
                          <Icon
                            size={18}
                            className="mt-0.5 shrink-0 text-neutral-700"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-neutral-950">
                              {method.label}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-neutral-500">
                              {method.detail}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                )}
                {paymentMethod === "offline" && (
                  <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                    Your order will be recorded as unpaid. The store must
                    confirm offline payment separately.
                  </p>
                )}
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
            </form>
          </section>

          <aside className="border border-neutral-200 bg-white p-5 sm:p-7 lg:sticky lg:top-40">
            <h2 className="text-base font-semibold">Order summary</h2>
            <ul className="mt-5 max-h-[42vh] space-y-4 overflow-y-auto border-b border-neutral-200 pb-5">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <div className="relative size-17 shrink-0 bg-neutral-100">
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-800 text-[10px] text-white">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${item.productId}`}
                      className="block truncate text-xs font-medium text-neutral-950 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatPrice(item.price)} each
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        disabled={mutating}
                        onClick={() =>
                          setQuantity(item.productId, item.quantity - 1)
                        }
                        className="inline-flex size-7 items-center justify-center border border-neutral-200 text-neutral-600 hover:border-neutral-950 disabled:opacity-40"
                      >
                        <Minus size={12} aria-hidden="true" />
                      </button>
                      <span className="w-7 text-center text-xs tabular-nums">
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
                        className="inline-flex size-7 items-center justify-center border border-neutral-200 text-neutral-600 hover:border-neutral-950 disabled:opacity-40"
                      >
                        <Plus size={12} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        disabled={mutating}
                        onClick={() => removeItem(item.productId)}
                        className="ml-1 inline-flex size-7 items-center justify-center text-neutral-400 hover:text-red-700 disabled:opacity-40"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 text-xs font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-b border-neutral-200 py-4 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span className="inline-flex items-center gap-2">
                  <Truck size={15} aria-hidden="true" /> Shipping
                </span>
                <span>
                  {shipping === 0 ? "Complimentary" : formatPrice(shipping)}
                </span>
              </div>
              {subtotal < 75 && (
                <p className="text-xs leading-5 text-neutral-500">
                  Add {formatPrice(75 - subtotal)} more for complimentary
                  shipping.
                </p>
              )}
            </div>
            <div className="flex justify-between py-4 text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(subtotal + shipping)}</span>
            </div>
            <button
              form="checkout-form"
              type="submit"
              disabled={pending || items.length === 0}
              className="flex min-h-12 w-full items-center justify-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
            >
              {pending && (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              )}
              {paymentMethod === "offline"
                ? "Place offline order"
                : `Continue to ${paymentMethods.find((method) => method.id === paymentMethod)?.label || "payment"}`}{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-neutral-500">
              Stock and pricing are confirmed when the order is placed.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
