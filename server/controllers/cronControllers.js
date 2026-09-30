import { releaseExpiredPendingOrders } from "../services/orderState.js";

/**
 * Scheduled cleanup for abandoned online checkouts.
 *
 * The long-running server performs this sweep in-process every five minutes
 * (see `server.js`). A serverless deployment has no always-on process, so
 * Vercel calls this route from the `crons` entry in `vercel.json` instead.
 *
 * Vercel sends the value of CRON_SECRET as a bearer token, which is what makes
 * this safe to expose: without a configured secret it refuses to run at all.
 */
export const releaseExpiredOrders = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({
      success: false,
      message: "CRON_SECRET is not configured on this deployment.",
    });
    return;
  }

  const token = req.get("authorization") || "";
  if (token !== `Bearer ${secret}`) {
    res.status(401).json({ success: false, message: "Unauthorized." });
    return;
  }

  // A cron run is a single chance to catch everything, so sweep a wider batch
  // than the five-minute in-process timer would.
  const released = await releaseExpiredPendingOrders({ limit: 100 });
  if (released > 0) {
    console.log(`[cron] Released ${released} expired pending order(s).`);
  }

  res.status(200).json({ success: true, released });
};