import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  PackageCheck,
  RotateCw,
} from "lucide-react";
import api from "../lib/api";
import { formatDate, formatPrice } from "../lib/format";

const statusStyles = {
  pending: "bg-amber-50 text-amber-900",
  processing: "bg-sky-50 text-sky-900",
  shipped: "bg-indigo-50 text-indigo-900",
  delivered: "bg-emerald-50 text-emerald-900",
  cancelled: "bg-neutral-100 text-neutral-700",
};

const Orders = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const user = useSelector((state) => state.user.user);
  const [result, setResult] = useState({
    key: "",
    orders: [],
    order: null,
    error: "",
  });
  const [retry, setRetry] = useState(0);
  const requestKey = `${orderId || "mine"}:${retry}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    const request = orderId
      ? api
          .get(`/api/orders/${orderId}`, { signal: controller.signal })
          .then(({ data }) => ({ order: data.order, orders: [] }))
      : api
          .get("/api/orders/mine", { signal: controller.signal })
          .then(({ data }) => ({ order: null, orders: data.orders }));

    request
      .then((data) => setResult({ key: requestKey, ...data, error: "" }))
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setResult({
            key: requestKey,
            order: null,
            orders: [],
            error:
              requestError.response?.data?.message ||
              "We couldn’t load your order information.",
          });
        }
      });
    return () => controller.abort();
  }, [orderId, requestKey, user]);

  if (!user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-5">
        <section className="text-center">
          <h1 className="text-3xl font-medium">Sign in to see your orders.</h1>
          <Link
            to="/account"
            state={{ from: orderId ? `/orders/${orderId}` : "/orders" }}
            className="mt-6 inline-flex min-h-11 items-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white"
          >
            Sign in <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </main>
    );
  }

  const order = loading ? null : result.order;
  const orders = loading ? [] : result.orders;

  return (
    <main className="min-h-screen bg-[#f4f3ef] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
      <div className="mx-auto max-w-5xl">
        {orderId ? (
          <>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-950"
            >
              <ArrowLeft size={14} aria-hidden="true" /> All orders
            </Link>
            {loading ? (
              <Loading />
            ) : result.error ? (
              <ErrorState
                message={result.error}
                onRetry={() => setRetry((value) => value + 1)}
              />
            ) : (
              order && (
                <section className="mt-5 border border-neutral-200 bg-white p-5 sm:p-8">
                  <div className="flex flex-col justify-between gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                        {location.state?.justPlaced
                          ? "Order received"
                          : "Order details"}
                      </p>
                      <h1 className="mt-2 text-3xl font-medium">
                        {order.orderNumber}
                      </h1>
                      <p className="mt-2 text-sm text-neutral-500">
                        Placed {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`w-fit px-3 py-1.5 text-xs font-semibold capitalize ${statusStyles[order.status] || "bg-neutral-100 text-neutral-700"}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  {location.state?.justPlaced && (
                    <p
                      role="status"
                      className="mt-5 border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"
                    >
                      Your order is recorded. Payment is not collected online
                      and remains unpaid until confirmed by the store.
                    </p>
                  )}
                  <div className="mt-7 grid gap-8 md:grid-cols-[1fr_280px]">
                    <div>
                      <h2 className="text-sm font-semibold">Items</h2>
                      <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
                        {order.items.map((item) => (
                          <li key={item.productId} className="flex gap-3 py-4">
                            <div className="size-16 shrink-0 bg-neutral-100">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="mt-1 text-xs text-neutral-500">
                                Qty {item.quantity} ·{" "}
                                {formatPrice(item.unitPrice)} each
                              </p>
                            </div>
                            <p className="text-sm font-medium">
                              {formatPrice(item.lineTotal)}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <h2 className="mt-7 text-sm font-semibold">
                        Delivery address
                      </h2>
                      <address className="mt-3 text-sm not-italic leading-6 text-neutral-600">
                        {order.shippingAddress.fullName}
                        <br />
                        {order.shippingAddress.addressLine1}
                        {order.shippingAddress.addressLine2 && (
                          <>
                            <br />
                            {order.shippingAddress.addressLine2}
                          </>
                        )}
                        <br />
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.region}{" "}
                        {order.shippingAddress.postalCode}
                        <br />
                        {order.shippingAddress.country}
                        <br />
                        {order.shippingAddress.email} ·{" "}
                        {order.shippingAddress.phone}
                      </address>
                    </div>
                    <aside className="h-fit border border-neutral-200 bg-[#faf9f6] p-5">
                      <h2 className="text-sm font-semibold">Payment summary</h2>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between text-neutral-600">
                          <span>Subtotal</span>
                          <span>{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-neutral-600">
                          <span>Shipping</span>
                          <span>
                            {order.shipping
                              ? formatPrice(order.shipping)
                              : "Complimentary"}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold">
                          <span>Total</span>
                          <span>{formatPrice(order.total)}</span>
                        </div>
                      </div>
                      <div className="mt-5 border-t border-neutral-200 pt-4">
                        <p className="text-xs text-neutral-500">
                          Payment status
                        </p>
                        <p className="mt-1 text-sm font-medium capitalize">
                          {order.paymentStatus.replaceAll("_", " ")}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-neutral-500">
                          Offline payment. The store will confirm payment
                          separately.
                        </p>
                      </div>
                    </aside>
                  </div>
                </section>
              )
            )}
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Astra / Account
            </p>
            <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 className="text-3xl font-medium">Your orders</h1>
                <p className="mt-2 text-sm text-neutral-600">
                  Updates and details for your Astra purchases.
                </p>
              </div>
              <Link
                to="/collection"
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold hover:text-amber-800"
              >
                Continue shopping <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            {loading ? (
              <Loading />
            ) : result.error ? (
              <ErrorState
                message={result.error}
                onRetry={() => setRetry((value) => value + 1)}
              />
            ) : orders.length === 0 ? (
              <div className="mt-7 border border-neutral-200 bg-white px-6 py-16 text-center">
                <PackageCheck
                  size={24}
                  className="mx-auto text-neutral-400"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-lg font-medium">No orders yet</h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Your order history will appear here after checkout.
                </p>
                <Link
                  to="/collection"
                  className="mt-5 inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-4 text-sm font-semibold text-white"
                >
                  Explore the collection{" "}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <div className="mt-7 space-y-3">
                {orders.map((item) => (
                  <Link
                    key={item._id}
                    to={`/orders/${item._id}`}
                    className="block border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-500 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-xs text-neutral-500">
                          {formatDate(item.createdAt)}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {item.orderNumber}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.items.length}{" "}
                          {item.items.length === 1 ? "line item" : "line items"}{" "}
                          · {formatPrice(item.total)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <span
                          className={`px-3 py-1.5 text-xs font-semibold capitalize ${statusStyles[item.status] || "bg-neutral-100 text-neutral-700"}`}
                        >
                          {item.status}
                        </span>
                        <ArrowRight
                          size={16}
                          className="text-neutral-400"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

const Loading = () => (
  <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-neutral-500">
    <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
    Loading orders
  </div>
);
const ErrorState = ({ message, onRetry }) => (
  <div className="mt-7 flex min-h-48 flex-col items-center justify-center border border-neutral-200 bg-white p-6 text-center">
    <p role="alert" className="text-sm text-red-700">
      {message}
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
    >
      Try again <RotateCw size={14} aria-hidden="true" />
    </button>
  </div>
);

export default Orders;
