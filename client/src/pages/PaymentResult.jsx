import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  LoaderCircle,
  RotateCw,
} from "lucide-react";
import api from "../lib/api";
import { useCart } from "../hooks/useCart";

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const provider = searchParams.get("provider");
  const providerResult = searchParams.get("result");
  const sessionId = searchParams.get("session_id");
  const tracker = searchParams.get("tracker");
  const sig = searchParams.get("sig");
  const user = useSelector((state) => state.user.user);
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [state, setState] = useState({
    order: null,
    loading: true,
    error: "",
    timedOut: false,
  });
  const paidRedirected = useRef(false);
  const needsAuth = !orderId || !user;

  useEffect(() => {
    if (needsAuth) return undefined;

    let active = true;
    let timer;
    const canConfirmWithProvider =
      provider === "stripe" ? true : Boolean(tracker && sig);

    /**
     * Ask the server to verify the payment with the provider. This is the
     * localhost-friendly path: no webhook tunnel required.
     */
    const confirmWithProvider = async () => {
      if (!canConfirmWithProvider) return null;
      const { data } = await api.post(`/api/orders/${orderId}/confirm`, {
        sessionId,
        tracker,
        sig,
      });
      return data;
    };

    const pollOrder = async (attempt) => {
      try {
        let confirmation = null;
        if (attempt === 0 && canConfirmWithProvider) {
          confirmation = await confirmWithProvider();
        }

        const { data } = confirmation
          ? { data: { order: confirmation.order } }
          : await api.get(`/api/orders/${orderId}`);

        if (!active) return;
        const order = data.order;
        setState({ order, loading: false, error: "", timedOut: false });
        if (order.paymentStatus === "paid") {
          if (!paidRedirected.current) {
            paidRedirected.current = true;
            await refresh();
            // Navigation to the order page is the confirmation — no toast.
            navigate(`/orders/${orderId}`, {
              replace: true,
              state: { justPaid: true },
            });
          }
          return;
        }
        if (
          ["failed", "refunded"].includes(order.paymentStatus) ||
          order.status === "cancelled"
        )
          return;
        if (attempt < 12) {
          timer = window.setTimeout(() => pollOrder(attempt + 1), 2500);
        } else {
          setState((current) => ({ ...current, timedOut: true }));
        }
      } catch (requestError) {
        if (!active) return;
        setState({
          order: null,
          loading: false,
          error:
            requestError.response?.data?.message ||
            "We couldn’t retrieve this payment status.",
          timedOut: false,
        });
      }
    };

    pollOrder(0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    navigate,
    needsAuth,
    orderId,
    provider,
    refresh,
    sessionId,
    sig,
    tracker,
    user,
  ]);

  if (!user) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#f4f3ef] px-5">
        <section className="w-full max-w-md border border-neutral-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-medium">Sign in to check payment.</h1>
          <Link
            to="/account"
            state={{ from: `/payment-result?${searchParams.toString()}` }}
            className="mt-5 inline-flex min-h-11 items-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white"
          >
            Sign in <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </main>
    );
  }

  if (!orderId) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#f4f3ef] px-5">
        <section className="w-full max-w-md border border-neutral-200 bg-white p-8 text-center">
          <CircleX size={26} className="mx-auto text-amber-800" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-medium">
            This payment link is incomplete.
          </h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            The order reference is missing, so we cannot show a payment status.
          </p>
          <Link
            to="/orders"
            className="mt-6 inline-flex min-h-11 items-center gap-2 bg-neutral-950 px-5 text-sm font-semibold text-white"
          >
            Order history <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </main>
    );
  }

  const cancelled = providerResult === "cancelled";
  const paid = state.order?.paymentStatus === "paid";
  const failed =
    state.order?.paymentStatus === "failed" ||
    state.order?.status === "cancelled";

  return (
    <main className="flex min-h-[65vh] items-center justify-center bg-[#f4f3ef] px-5 py-12">
      <section className="w-full max-w-xl border border-neutral-200 bg-white p-6 sm:p-10">
        {paid ? (
          <>
            <CircleCheck
              size={28}
              className="text-emerald-700"
              aria-hidden="true"
            />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
              Payment confirmed
            </p>
            <h1 className="mt-2 text-3xl font-medium">
              Thank you for your order.
            </h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Your {provider === "safepay" ? "Safepay" : "Stripe"} payment was
              verified by the server.
            </p>
          </>
        ) : failed ? (
          <>
            <CircleX size={28} className="text-red-700" aria-hidden="true" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-red-800">
              Payment not completed
            </p>
            <h1 className="mt-2 text-3xl font-medium">
              No payment was recorded.
            </h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Return to checkout to choose another method or try again.
            </p>
          </>
        ) : state.error ? (
          <>
            <CircleX size={28} className="text-amber-800" aria-hidden="true" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Payment status
            </p>
            <h1 className="mt-2 text-3xl font-medium">
              We couldn’t verify this order.
            </h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-neutral-600">
              {state.error}
            </p>
          </>
        ) : (
          <>
            <LoaderCircle
              size={28}
              className="animate-spin text-amber-800"
              aria-hidden="true"
            />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              {cancelled ? "Checkout returned" : "Verifying payment"}
            </p>
            <h1 className="mt-2 text-3xl font-medium">
              {cancelled
                ? "Checking your latest payment status."
                : "Waiting for provider confirmation."}
            </h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              We only mark an order paid after the server verifies it with{" "}
              {provider === "safepay" ? "Safepay" : "Stripe"} — either through a
              signed provider response or a verified webhook. This page updates
              automatically.
            </p>
            {state.timedOut && (
              <p
                role="status"
                className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950"
              >
                Confirmation is taking longer than expected. Don’t pay again
                yet; check your order history or refresh the status.
              </p>
            )}
          </>
        )}

        {state.order && (
          <p className="mt-5 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
            Order {state.order.orderNumber} · {state.order.paymentStatus}
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          {state.order && (
            <Link
              to={`/orders/${state.order._id}`}
              className="inline-flex min-h-11 items-center gap-2 bg-neutral-950 px-4 text-sm font-semibold text-white"
            >
              View order <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
          {(failed || cancelled || state.error || state.timedOut) && (
            <Link
              to="/orders"
              className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 text-sm font-medium text-neutral-800"
            >
              Order history
            </Link>
          )}
          {state.timedOut && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 text-sm font-medium"
            >
              <RotateCw size={14} aria-hidden="true" /> Refresh status
            </button>
          )}
          {failed && (
            <Link
              to="/collection"
              className="inline-flex min-h-11 items-center gap-2 border border-neutral-300 px-4 text-sm font-medium"
            >
              Continue shopping
            </Link>
          )}
        </div>
      </section>
    </main>
  );
};

export default PaymentResult;
