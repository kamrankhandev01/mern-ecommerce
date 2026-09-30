import mongoose from "mongoose";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { amountsMatch } from "./paymentProviders.js";

/**
 * Shared order state transitions.
 *
 * Keeping these in one module means the webhooks, the verified return-URL
 * confirmation and the background sweeper all mutate orders through exactly
 * the same guarded, idempotent code path.
 */

export const rollbackReservedStock = async (reservedItems) => {
  for (const item of reservedItems) {
    await productModel.updateOne(
      { _id: item.productId },
      { $inc: { stock: item.quantity } },
    );
  }
};

/** Cancel a still-pending online order and give its reserved stock back. */
export const releasePendingOrder = async (orderId, paymentStatus = "failed") => {
  if (!mongoose.isValidObjectId(String(orderId || ""))) return null;
  const order = await orderModel.findOneAndUpdate(
    {
      _id: orderId,
      status: "pending",
      paymentStatus: "pending",
      inventoryRestored: { $ne: true },
    },
    {
      $set: {
        status: "cancelled",
        paymentStatus,
        inventoryRestored: true,
      },
    },
    { new: true },
  );
  if (!order) return null;

  await rollbackReservedStock(
    order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  );
  return order;
};

/**
 * Move a pending online order to paid + processing, exactly once.
 * Throws when a provider reports an amount that does not match the order.
 */
export const markOnlineOrderPaid = async ({
  orderId,
  paymentMethod,
  providerPaymentId,
  amount,
}) => {
  if (!mongoose.isValidObjectId(String(orderId || ""))) return null;
  const order = await orderModel.findOne({ _id: orderId, paymentMethod });
  if (!order || order.status === "cancelled") return null;

  if (amount !== undefined && !amountsMatch(order.total, amount)) {
    throw new Error("Payment amount does not match the order total.");
  }

  return orderModel.findOneAndUpdate(
    {
      _id: orderId,
      paymentMethod,
      paymentStatus: "pending",
      status: "pending",
    },
    {
      $set: {
        paymentStatus: "paid",
        status: "processing",
        providerPaymentId: String(providerPaymentId || ""),
      },
    },
    { new: true },
  );
};

/**
 * Release stock for online orders whose checkout window expired without a
 * confirmed payment. Runs periodically so abandoned checkouts never hold
 * inventory hostage.
 */
export const releaseExpiredPendingOrders = async ({ limit = 25 } = {}) => {
  const expired = await orderModel
    .find({
      status: "pending",
      paymentStatus: "pending",
      paymentExpiresAt: { $ne: null, $lt: new Date() },
      inventoryRestored: { $ne: true },
    })
    .select("_id")
    .limit(limit)
    .lean();

  let released = 0;
  for (const order of expired) {
    const result = await releasePendingOrder(order._id, "failed");
    if (result) released += 1;
  }
  return released;
};

export default {
  markOnlineOrderPaid,
  releaseExpiredPendingOrders,
  releasePendingOrder,
  rollbackReservedStock,
};
