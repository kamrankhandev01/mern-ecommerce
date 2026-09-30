/**
 * Central environment configuration.
 *
 * Everything the server needs is resolved and validated once, at boot, so a
 * misconfigured deployment fails fast with an actionable message instead of
 * surfacing as a confusing runtime error later.
 */

const isProduction = () => process.env.NODE_ENV === "production";

const bool = (value, fallback = false) => {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const num = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const trimSlash = (value) => String(value || "").replace(/\/+$/, "");

/** Comma separated list of allowed browser origins. */
const clientOrigins = () => {
  const raw = process.env.CLIENT_URL || process.env.FRONTEND_URL || "";
  return raw
    .split(",")
    .map((origin) => trimSlash(origin.trim()))
    .filter(Boolean);
};

const primaryClientUrl = () =>
  clientOrigins()[0] ||
  (isProduction() ? "" : "http://localhost:5173");

export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV || "development";
  },
  get isProduction() {
    return isProduction();
  },
  get isTest() {
    return process.env.NODE_ENV === "test";
  },
  get port() {
    return num(process.env.PORT, 3000);
  },
  get mongoUri() {
    return process.env.MONGO_URI || "";
  },
  get jwtSecret() {
    return process.env.JWT_SECRET || "";
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || "7d";
  },
  get clientOrigins() {
    return clientOrigins();
  },
  get clientUrl() {
    return primaryClientUrl();
  },
  /** Cookies may only use SameSite=None when the browser origin is HTTPS. */
  get cookieSecure() {
    return isProduction();
  },
  get cookieSameSite() {
    return isProduction() ? "none" : "lax";
  },
  get trustProxy() {
    return bool(process.env.TRUST_PROXY, isProduction());
  },
  get jsonLimit() {
    return process.env.JSON_LIMIT || "1mb";
  },
  get maxUploadBytes() {
    return num(process.env.MAX_UPLOAD_BYTES, 5 * 1024 * 1024);
  },
  get smtp() {
    return {
      host: process.env.SMTP_SERVER || "",
      port: num(process.env.SMTP_PORT, 587),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      sender: process.env.SMTP_SENDER_EMAIL || "",
    };
  },
  get cloudinary() {
    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
      apiKey: process.env.CLOUDINARY_API_KEY || "",
      apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    };
  },
  get stripe() {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY || "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    };
  },
  get safepay() {
    return {
      environment: process.env.SAFEPAY_ENVIRONMENT || "sandbox",
      apiKey: process.env.SAFEPAY_PUBLISH_KEY || "",
      v1Secret: process.env.SAFEPAY_SECRET_KEY || "",
      webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET || "",
      currency: (process.env.SAFEPAY_CURRENCY || "USD").toUpperCase(),
    };
  },
  get currency() {
    return (process.env.STORE_CURRENCY || "USD").toUpperCase();
  },
  get freeShippingThreshold() {
    return Number(process.env.FREE_SHIPPING_THRESHOLD || 75);
  },
  get flatShippingRate() {
    return Number(process.env.FLAT_SHIPPING_RATE || 8);
  },
  /** Minutes a hosted checkout link stays reservable before stock is released. */
  get checkoutWindowMinutes() {
    return num(process.env.CHECKOUT_WINDOW_MINUTES, 32);
  },
  get maxItemsPerOrder() {
    return num(process.env.MAX_ITEMS_PER_ORDER, 99);
  },
};

/**
 * Hard requirements — without these the server cannot do its job at all.
 * Payment providers, SMTP and Cloudinary are optional: each feature that
 * depends on them reports itself as unconfigured instead of crashing.
 */
export const assertRequiredEnv = () => {
  const missing = [];
  if (!env.mongoUri) missing.push("MONGO_URI");
  if (!env.jwtSecret || env.jwtSecret.length < 24) {
    missing.push("JWT_SECRET (minimum 24 characters)");
  }
  if (env.isProduction && env.clientOrigins.length === 0) {
    missing.push("CLIENT_URL (required in production)");
  }
  if (missing.length) {
    throw new Error(
      `Missing or invalid environment variables:\n  - ${missing.join("\n  - ")}\n` +
        "Copy server/.env.example to server/.env and fill in the values.",
    );
  }
  return true;
};

/** Non-fatal configuration warnings, logged once at boot. */
export const configurationWarnings = () => {
  const warnings = [];
  if (!env.smtp.host || !env.smtp.sender) {
    warnings.push(
      "SMTP is not configured — registration, OTP and reset emails will be skipped.",
    );
  }
  if (!env.cloudinary.cloudName) {
    warnings.push(
      "Cloudinary is not configured — product and profile image uploads will fail.",
    );
  }
  if (!env.stripe.secretKey) {
    warnings.push("Stripe is not configured — card checkout is disabled.");
  }
  if (!env.safepay.apiKey || !env.safepay.webhookSecret) {
    warnings.push("Safepay is not configured — Safepay checkout is disabled.");
  }
  if (env.isProduction && !env.trustProxy) {
    warnings.push(
      "TRUST_PROXY is disabled in production — rate limiting may see proxy IPs.",
    );
  }
  return warnings;
};

export default env;
