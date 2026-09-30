/**
 * The Express application.
 *
 * It is built here and nowhere else, so the exact same app can be served by two
 * entry points:
 *
 *  - `server.js` — a long-running Node process (local dev, Render, Railway).
 *  - Vercel      — a serverless function, which must never call `app.listen()`.
 *
 * Nothing below starts a timer or opens a port. The one piece of shared state,
 * the database connection, is opened lazily by `ensureDatabase` and reused for
 * the lifetime of the instance.
 */

import "dotenv/config";
import dns from "node:dns";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";

// Some networks fail to resolve MongoDB Atlas SRV records with the default
// resolver; pinning public DNS keeps SRV lookups working everywhere.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import { ensureDatabase } from "./config/db.js";
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

export const createApp = () => {
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

  // A health check is a plain GET with no body, so it is answered before the
  // body parsers and before the database — that is the whole point of it: it has
  // to report an outage rather than become one.
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

  // Everything below touches the database. A serverless instance connects on its
  // first request instead of at boot, so a cold start never blocks on Mongo.
  app.use(async (req, res, next) => {
    try {
      await ensureDatabase();
      next();
    } catch (error) {
      console.error("Database connection failed:", error.message);
      res.status(503).json({
        success: false,
        message: "The store is briefly unavailable. Please try again.",
      });
    }
  });

  // Stripe signs the raw request body, so this route must be registered before
  // the JSON body parser runs.
  app.post(
    "/api/orders/webhooks/stripe",
    express.raw({ type: "application/json" }),
    handleStripeWebhook,
  );

  app.use(express.json({ limit: env.jsonLimit }));
  app.use(express.urlencoded({ extended: false, limit: env.jsonLimit }));

  app.use("/api/auth", authRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/products", productRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/wishlist", wishlistRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

// Fail fast on a misconfigured deployment. Importing this module throws with an
// actionable message rather than letting requests 500 one at a time.
assertRequiredEnv();
for (const warning of configurationWarnings()) {
  console.warn(`[config] ${warning}`);
}

const app = createApp();

export default app;