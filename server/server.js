import "dotenv/config";
import dns from "node:dns";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";

// Some networks fail to resolve MongoDB Atlas SRV records with the default
// resolver; pinning public DNS keeps SRV lookups working everywhere.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import connectDB from "./config/db.js";
import env, { assertRequiredEnv, configurationWarnings } from "./config/env.js";
import authRouter from "./routes/auth.js";
import cartRouter from "./routes/cartRoutes.js";
import contactRouter from "./routes/contactRoutes.js";
import productRouter from "./routes/productRoutes.js";
import wishlistRouter from "./routes/wishlistRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import { handleStripeWebhook } from "./controllers/orderControllers.js";
import securityHeaders from "./middlewares/security.js";
import errorHandler, { ApiError, notFoundHandler } from "./middlewares/errorHandler.js";
import { releaseExpiredPendingOrders } from "./services/orderState.js";

assertRequiredEnv();
for (const warning of configurationWarnings()) {
  console.warn(`[config] ${warning}`);
}

const app = express();

app.disable("x-powered-by");
if (env.trustProxy) app.set("trust proxy", 1);

app.use(securityHeaders);
app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin and server-to-server requests send no Origin header.
      if (!origin) return callback(null, true);
      const allowed = env.clientOrigins;
      if (allowed.length === 0 || allowed.includes(origin.replace(/\/+$/, ""))) {
        return callback(null, true);
      }
      return callback(
        new ApiError(403, `Origin ${origin} is not allowed by CORS.`),
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  }),
);
app.use(cookieParser());

// Stripe signs the raw request body, so this route must be registered before
// the JSON body parser runs.
app.post(
  "/api/orders/webhooks/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

app.use(express.json({ limit: env.jsonLimit }));
app.use(express.urlencoded({ extended: false, limit: env.jsonLimit }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
    environment: env.nodeEnv,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/cart", cartRouter);
app.use("/api/contact", contactRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/wishlist", wishlistRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(
      `Server running on port ${env.port} (${env.nodeEnv}) — allowed origins: ${
        env.clientOrigins.join(", ") || "any"
      }`,
    );
  });

  // Abandoned online checkouts must not hold inventory forever.
  const sweeper = setInterval(async () => {
    try {
      const released = await releaseExpiredPendingOrders();
      if (released > 0) {
        console.log(`Released ${released} expired pending order(s).`);
      }
    } catch (error) {
      console.error("Expired order sweep failed:", error);
    }
  }, 5 * 60 * 1000);
  sweeper.unref();

  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully.`);
    clearInterval(sweeper);
    server.close(async () => {
      await mongoose.disconnect().catch(() => {});
      process.exit(0);
    });
    // Never hang the process if connections refuse to drain.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  return server;
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});

export default app;
