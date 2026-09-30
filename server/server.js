import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "./config/db.js";
import env from "./config/env.js";
import app from "./app.js";
import { releaseExpiredPendingOrders } from "./services/orderState.js";

/**
 * The long-running entry point (`npm start`).
 *
 * The app itself lives in `app.js` so a serverless platform can serve exactly
 * the same routes without a listening socket. Only the things that genuinely
 * need a long-lived process stay here: the port, the background sweeper and
 * graceful shutdown.
 */

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
