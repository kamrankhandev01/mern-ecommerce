import crypto from "node:crypto";
import Stripe from "stripe";
import { Safepay } from "@sfpy/node-sdk";
import env from "../config/env.js";

/**
 * Single source of truth for every hosted-checkout provider.
 *
 * Two confirmation paths are supported for each provider:
 *  1. Webhooks (authoritative, requires a publicly reachable server).
 *  2. A verified return-URL round trip, which lets a developer confirm a real
 *     payment on localhost without a tunnel.
 */

const SAFEPAY_SUPPORTED_CURRENCY = "USD";

let stripeClient = null;
let safepayClient = null;

export const isStripeConfigured = () =>
  Boolean(env.stripe.secretKey && env.stripe.webhookSecret);

export const isSafepayConfigured = () =>
  Boolean(
    env.safepay.apiKey &&
      env.safepay.v1Secret &&
      env.safepay.webhookSecret &&
      env.safepay.currency === SAFEPAY_SUPPORTED_CURRENCY,
  );

/** Payment method ids the store can currently offer, in display order. */
export const getConfiguredPaymentMethodIds = () => {
  const methods = [];
  if (isStripeConfigured()) methods.push("stripe");
  if (isSafepayConfigured()) methods.push("safepay");
  return methods;
};

export const PAYMENT_METHOD_IDS = ["offline", "stripe", "safepay"];

export const getStripeClient = () => {
  if (!isStripeConfigured()) {
    throw new Error("Stripe checkout is not configured on the server.");
  }
  stripeClient ??= new Stripe(env.stripe.secretKey, {
    maxNetworkRetries: 2,
    timeout: 15000,
  });
  return stripeClient;
};

export const getSafepayClient = () => {
  if (!isSafepayConfigured()) {
    throw new Error("Safepay checkout is not configured on the server.");
  }
  safepayClient ??= new Safepay({
    environment: env.safepay.environment,
    apiKey: env.safepay.apiKey,
    v1Secret: env.safepay.v1Secret,
    webhookSecret: env.safepay.webhookSecret,
  });
  return safepayClient;
};

/** Stripe requires an expiry between 30 and 1440 minutes from creation. */
const stripeExpiryMinutes = () =>
  Math.min(Math.max(env.checkoutWindowMinutes, 31), 1440);

const round = (value) => Math.round(Number(value) || 0);

export const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const amountsMatch = (expected, received) =>
  Number.isFinite(Number(received)) &&
  Math.abs(roundMoney(received) - roundMoney(expected)) <= 0.01;

export const createStripeCheckout = async ({ order, returnUrl }) => {
  const stripe = getStripeClient();
  const currency = (order.currency || env.currency).toLowerCase();
  const lineItems = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency,
      unit_amount: round(item.unitPrice * 100),
      product_data: {
        name: item.name,
        images: item.image ? [item.image] : undefined,
      },
    },
  }));

  if (order.shipping > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: round(order.shipping * 100),
        product_data: { name: "Shipping" },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    // `{CHECKOUT_SESSION_ID}` is substituted by Stripe so the return landing
    // page can ask the server to verify payment without relying on a webhook.
    success_url: `${returnUrl}&result=return&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}&result=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + stripeExpiryMinutes() * 60,
    client_reference_id: String(order._id),
    metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
    payment_intent_data: {
      metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return {
    checkoutUrl: session.url,
    providerSessionId: session.id,
    paymentExpiresAt: new Date(session.expires_at * 1000),
  };
};

export const createSafepayCheckout = async ({ order, returnUrl }) => {
  const safepay = getSafepayClient();
  const { token } = await safepay.payments.create({
    amount: Number(order.total.toFixed(2)),
    currency: SAFEPAY_SUPPORTED_CURRENCY,
  });

  if (!token) {
    throw new Error("Safepay did not return a payment token.");
  }

  const checkoutUrl = safepay.checkout.create({
    token,
    orderId: String(order._id),
    cancelUrl: `${returnUrl}&result=cancelled`,
    redirectUrl: `${returnUrl}&result=return`,
    source: "custom",
    webhooks: true,
  });

  return {
    checkoutUrl,
    providerSessionId: token,
    paymentExpiresAt: new Date(
      Date.now() + env.checkoutWindowMinutes * 60 * 1000,
    ),
  };
};

export const createProviderCheckout = async ({
  order,
  paymentMethod,
  returnUrl,
}) => {
  if (paymentMethod === "stripe") {
    return createStripeCheckout({ order, returnUrl });
  }
  if (paymentMethod === "safepay") {
    return createSafepayCheckout({ order, returnUrl });
  }
  throw new Error("Unsupported payment method.");
};

/**
 * Fetch a Stripe Checkout Session for server-side verification.
 * Returns null when the session does not belong to the given order, so a
 * tampered return URL can never mark an unrelated order as paid.
 */
export const retrieveStripeSession = async (order, sessionId) => {
  if (!isStripeConfigured() || !sessionId) return null;
  const stripe = getStripeClient();

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    if (error?.code === "resource_missing") return null;
    throw error;
  }

  const sessionOrderId =
    session.client_reference_id || session.metadata?.orderId || "";
  if (String(sessionOrderId) !== String(order._id)) return null;
  return session;
};

/** Safepay signs the checkout redirect with HMAC-SHA256(v1Secret, tracker). */
export const verifySafepayRedirect = ({ tracker, sig }) => {
  if (!env.safepay.v1Secret || !tracker || !sig) return false;
  const expected = crypto
    .createHmac("sha256", env.safepay.v1Secret)
    .update(String(tracker))
    .digest("hex");
  return timingSafeEqualHex(expected, sig);
};

/** Safepay signs webhook payloads with HMAC-SHA512(webhookSecret, body.data). */
export const verifySafepayWebhook = (req) => {
  const webhookSecret = env.safepay.webhookSecret;
  const signature = req.headers["x-sfpy-signature"];
  if (!webhookSecret || !signature || !req.body?.data) return false;
  const expected = crypto
    .createHmac("sha512", webhookSecret)
    .update(Buffer.from(JSON.stringify(req.body.data)))
    .digest("hex");
  return timingSafeEqualHex(expected, signature);
};

const timingSafeEqualHex = (expected, provided) => {
  const left = Buffer.from(String(expected));
  const right = Buffer.from(String(provided || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export default {
  PAYMENT_METHOD_IDS,
  amountsMatch,
  createProviderCheckout,
  getConfiguredPaymentMethodIds,
  getSafepayClient,
  getStripeClient,
  isSafepayConfigured,
  isStripeConfigured,
  retrieveStripeSession,
  roundMoney,
  verifySafepayRedirect,
  verifySafepayWebhook,
};
