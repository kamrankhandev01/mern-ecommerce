import mongoose from "mongoose";
import Stripe from "stripe";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import env from "../config/env.js";
import { isValidEmail } from "../utils/validator.js";
import { calculateShipping, roundMoney } from "../utils/pricing.js";
import {
  PAYMENT_METHOD_IDS,
  createProviderCheckout,
  getConfiguredPaymentMethodIds,
  retrieveStripeSession,
  verifySafepayRedirect,
  verifySafepayWebhook,
} from "../services/paymentProviders.js";
import {
  markOnlineOrderPaid,
  releasePendingOrder,
  rollbackReservedStock,
} from "../services/orderState.js";
import { clearUserCart, getStoredCartQuantities } from "./cartControllers.js";

const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const allowedTransitions = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const PROGRESSIVE_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const ADMIN_PAYMENT_STATUSES = ["unpaid", "paid", "refunded"];

const clientBaseUrl = () => env.clientUrl || "http://localhost:5173";

const paymentReturnUrl = (order, paymentMethod) =>
  `${clientBaseUrl()}/payment-result?orderId=${order._id}&provider=${paymentMethod}`;

const buildOrderNumber = () =>
  `AST-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

export const getPaymentOptions = (req, res) => {
  const configured = getConfiguredPaymentMethodIds();
  const methods = [];
  if (configured.includes("stripe")) {
    methods.push({
      id: "stripe",
      label: "Credit or debit card",
      detail: "Secure checkout powered by Stripe",
    });
  }
  if (configured.includes("safepay")) {
    methods.push({
      id: "safepay",
      label: "Safepay",
      detail: "Secure hosted checkout",
    });
  }
  methods.push({
    id: "offline",
    label: "Pay offline",
    detail: "Payment is confirmed separately by the store",
  });

  return res.status(200).json({
    success: true,
    methods,
    currency: env.currency,
    freeShippingThreshold: env.freeShippingThreshold,
    shippingRate: env.flatShippingRate,
    onlinePaymentsEnabled: configured.length > 0,
  });
};

/**
 * Build authoritative order lines.
 *
 * Cart-based checkout reads quantities from the database; the legacy explicit
 * `items` payload is still accepted but never trusted for pricing.
 */
const resolveOrderItems = async ({ req, quantities }) => {
  const products = await productModel
    .find({ _id: { $in: [...quantities.keys()] } })
    .select("name price stock category images")
    .lean();

  const productById = new Map(
    products.map((product) => [String(product._id), product]),
  );
  if (productById.size !== quantities.size) {
    return {
      error: {
        status: 409,
        message:
          "A product in your cart is no longer available. Refresh your cart and try again.",
      },
    };
  }

  const orderItems = [];
  let subtotal = 0;
  for (const [productId, quantity] of quantities) {
    const product = productById.get(productId);
    const unitPrice = roundMoney(product.price);
    const lineTotal = roundMoney(unitPrice * quantity);
    orderItems.push({
      productId: product._id,
      name: product.name,
      image: product.images?.find((image) => image.url)?.url || "",
      unitPrice,
      quantity,
      lineTotal,
    });
    subtotal = roundMoney(subtotal + lineTotal);
  }
  return { orderItems, subtotal };
};

const normalizeShippingAddress = (rawAddress, user) => ({
  fullName: String(rawAddress.fullName || user.name || "").trim(),
  email: String(rawAddress.email || user.email || "")
    .trim()
    .toLowerCase(),
  phone: String(rawAddress.phone || "").trim(),
  addressLine1: String(rawAddress.addressLine1 || "").trim(),
  addressLine2: String(rawAddress.addressLine2 || "").trim(),
  city: String(rawAddress.city || "").trim(),
  region: String(rawAddress.region || "").trim(),
  postalCode: String(rawAddress.postalCode || "").trim(),
  country: String(rawAddress.country || "").trim(),
});

const isShippingAddressComplete = (address) =>
  Boolean(
    address.fullName &&
      isValidEmail(address.email) &&
      address.phone &&
      address.addressLine1 &&
      address.city &&
      address.region &&
      address.postalCode &&
      address.country,
  );

/** Reduce client input to a validated `productId -> quantity` map. */
const collectQuantities = (rawItems) => {
  const quantities = new Map();
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: { status: 400, message: "Your cart is empty." } };
  }

  for (const item of rawItems) {
    const productId = String(item.productId || "");
    const quantity = Number(item.quantity);
    if (
      !mongoose.isValidObjectId(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > env.maxItemsPerOrder
    ) {
      return {
        error: {
          status: 400,
          message: "One or more cart items are invalid.",
        },
      };
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    if (quantities.get(productId) > env.maxItemsPerOrder) {
      return {
        error: {
          status: 400,
          message: `A maximum of ${env.maxItemsPerOrder} units per product can be ordered at once.`,
        },
      };
    }
  }
  return { quantities };
};

export const createOrder = async (req, res) => {
  const reservedItems = [];
  let createdOrder = null;
  try {
    const paymentMethod = req.body.paymentMethod || "offline";
    if (!PAYMENT_METHOD_IDS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Choose a supported payment method.",
      });
    }
    if (
      paymentMethod !== "offline" &&
      !getConfiguredPaymentMethodIds().includes(paymentMethod)
    ) {
      const label = paymentMethod === "stripe" ? "Stripe" : "Safepay";
      return res.status(503).json({
        success: false,
        message: `${label} checkout is not configured on the server. Add the ${label} keys to server/.env to enable it.`,
      });
    }

    // Signed-in carts live in the database; `fromCart` is the primary path.
    const useCart = req.body.fromCart !== false;
    const source = useCart ? await getStoredCartQuantities(req.userId) : null;
    const collected = useCart
      ? { quantities: source }
      : collectQuantities(req.body.items);

    if (collected.error) {
      return res
        .status(collected.error.status)
        .json({ success: false, message: collected.error.message });
    }
    if (collected.quantities.size === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Your cart is empty." });
    }

    const shippingAddress = normalizeShippingAddress(
      req.body.shippingAddress || {},
      req.user,
    );
    if (!isShippingAddressComplete(shippingAddress)) {
      return res.status(400).json({
        success: false,
        message: "Complete all required shipping details with a valid email.",
      });
    }

    const resolved = await resolveOrderItems({
      req,
      quantities: collected.quantities,
    });
    if (resolved.error) {
      return res
        .status(resolved.error.status)
        .json({ success: false, message: resolved.error.message });
    }
    const { orderItems, subtotal } = resolved;

    // Reserve stock atomically; the filter guarantees we never oversell.
    for (const item of orderItems) {
      const reserved = await productModel.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true },
      );
      if (!reserved) {
        await rollbackReservedStock(reservedItems);
        reservedItems.length = 0;
        return res.status(409).json({
          success: false,
          message: `${item.name} no longer has enough stock. Refresh your cart and try again.`,
        });
      }
      reservedItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    const shipping = calculateShipping(subtotal);
    createdOrder = await orderModel.create({
      orderNumber: buildOrderNumber(),
      userId: req.userId,
      items: orderItems,
      shippingAddress,
      subtotal,
      shipping,
      total: roundMoney(subtotal + shipping),
      paymentMethod,
      paymentStatus: paymentMethod === "offline" ? "unpaid" : "pending",
      currency: env.currency,
      status: "pending",
    });

    if (paymentMethod !== "offline") {
      const checkout = await createProviderCheckout({
        order: createdOrder,
        paymentMethod,
        returnUrl: paymentReturnUrl(createdOrder, paymentMethod),
      });
      await orderModel.updateOne(
        { _id: createdOrder._id },
        {
          $set: {
            providerSessionId: checkout.providerSessionId,
            paymentExpiresAt: checkout.paymentExpiresAt,
          },
        },
      );
      // The cart is intentionally kept until payment is confirmed, so an
      // abandoned checkout can be resumed from any device.
      reservedItems.length = 0;
      return res.status(201).json({
        success: true,
        order: createdOrder,
        checkoutUrl: checkout.checkoutUrl,
      });
    }

    await clearUserCart(req.userId);
    reservedItems.length = 0;

    return res.status(201).json({ success: true, order: createdOrder });
  } catch (error) {
    try {
      await rollbackReservedStock(reservedItems);
    } catch (rollbackError) {
      console.error("Order inventory rollback failed:", rollbackError);
    }
    if (createdOrder && createdOrder.paymentStatus === "pending") {
      try {
        createdOrder.status = "cancelled";
        createdOrder.paymentStatus = "failed";
        createdOrder.inventoryRestored = true;
        await createdOrder.save();
      } catch (orderRollbackError) {
        console.error(
          "Failed to close order after checkout setup error:",
          orderRollbackError,
        );
      }
    }
    console.error("Create order failed:", error);
    return res.status(error.name === "CastError" ? 400 : 500).json({
      success: false,
      message:
        error.name === "CastError"
          ? "Invalid product in cart."
          : "We could not place your order. Please try again.",
    });
  }
};

/**
 * Server-side payment confirmation for the return leg of a hosted checkout.
 *
 * This is what makes Stripe and Safepay verifiable on localhost (where no
 * webhook can reach the server) without ever trusting the browser: the
 * provider is always re-queried or its signature re-verified here.
 */
export const confirmOrderPayment = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    const ownerId = String(order.userId);
    if (ownerId !== String(req.userId) && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "You cannot confirm this order." });
    }

    if (order.paymentStatus === "paid") {
      await clearUserCart(order.userId);
      return res.status(200).json({ success: true, paid: true, order });
    }

    if (!["stripe", "safepay"].includes(order.paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "This order does not use an online payment provider.",
      });
    }

    let paidOrder = null;

    if (order.paymentMethod === "stripe") {
      const sessionId = String(
        req.body.sessionId || req.query.session_id || order.providerSessionId,
      );
      const session = await retrieveStripeSession(order, sessionId);
      if (!session) {
        return res.status(400).json({
          success: false,
          message: "We could not verify that payment with Stripe.",
        });
      }
      if (session.currency && session.currency.toLowerCase() !== env.currency.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: "Unexpected currency on that payment.",
        });
      }
      if (session.payment_status === "paid") {
        paidOrder = await markOnlineOrderPaid({
          orderId: order._id,
          paymentMethod: "stripe",
          providerPaymentId: session.payment_intent,
          amount: Number(session.amount_total) / 100,
        });
      }
    } else {
      const { tracker, sig } = req.body;
      if (!verifySafepayRedirect({ tracker, sig })) {
        return res.status(400).json({
          success: false,
          message: "We could not verify that Safepay payment.",
        });
      }
      paidOrder = await markOnlineOrderPaid({
        orderId: order._id,
        paymentMethod: "safepay",
        providerPaymentId: tracker,
      });
    }

    if (paidOrder) {
      await clearUserCart(order.userId);
      return res.status(200).json({ success: true, paid: true, order: paidOrder });
    }

    const latest = await orderModel.findById(order._id);
    return res.status(200).json({
      success: true,
      paid: latest?.paymentStatus === "paid",
      order: latest || order,
    });
  } catch (error) {
    console.error("Confirm payment failed:", error);
    return res.status(500).json({
      success: false,
      message: "We could not confirm this payment. Please try again.",
    });
  }
};

export const handleStripeWebhook = async (req, res) => {
  if (!env.stripe.secretKey || !env.stripe.webhookSecret) {
    return res.status(503).json({ received: false });
  }

  let event;
  try {
    const stripe = new Stripe(env.stripe.secretKey);
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      env.stripe.webhookSecret,
    );
  } catch (error) {
    console.warn("Stripe webhook signature verification failed.");
    return res
      .status(400)
      .send(`Webhook signature verification failed: ${error.message}`);
  }

  try {
    const session = event.data.object;
    const orderId = session.metadata?.orderId || session.client_reference_id;

    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type) &&
      session.payment_status === "paid" &&
      String(session.currency).toLowerCase() === env.currency.toLowerCase()
    ) {
      const paid = await markOnlineOrderPaid({
        orderId,
        paymentMethod: "stripe",
        providerPaymentId: session.payment_intent,
        amount: Number(session.amount_total) / 100,
      });
      if (paid) await clearUserCart(paid.userId);
    } else if (
      [
        "checkout.session.expired",
        "checkout.session.async_payment_failed",
      ].includes(event.type) &&
      orderId
    ) {
      await releasePendingOrder(orderId, "failed");
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return res.status(500).json({ received: false });
  }
};

export const handleSafepayWebhook = async (req, res) => {
  if (!verifySafepayWebhook(req)) {
    return res
      .status(400)
      .json({ received: false, message: "Invalid Safepay webhook signature." });
  }

  try {
    const event = req.body.data || {};
    const notification = event.notification || {};
    const orderId =
      notification.metadata?.order_id ||
      notification.metadata?.orderId ||
      notification.order_id;
    if (!orderId) return res.status(200).json({ received: true });

    if (event.type === "payment:created") {
      if (String(notification.currency || "").toUpperCase() !== env.currency) {
        return res
          .status(400)
          .json({ received: false, message: "Unexpected Safepay currency." });
      }
      const paid = await markOnlineOrderPaid({
        orderId,
        paymentMethod: "safepay",
        providerPaymentId: notification.tracker || notification.reference,
        amount: notification.amount,
      });
      if (paid) await clearUserCart(paid.userId);
    } else if (event.type === "error:occurred") {
      await releasePendingOrder(orderId, "failed");
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Safepay webhook processing failed:", error);
    return res.status(500).json({ received: false });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Load orders failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load your orders." });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await orderModel
      .findById(req.params.id)
      .populate("userId", "name email")
      .lean();
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });

    const ownerId = order.userId?._id?.toString() || order.userId?.toString();
    if (ownerId !== String(req.userId) && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "You cannot view this order." });
    }
    return res.status(200).json({ success: true, order });
  } catch (error) {
    if (error.name === "CastError")
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    console.error("Load order failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load this order." });
  }
};

const parsePagination = (query, defaultLimit = 20, maxLimit = 50) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit),
  );
  return { page, limit };
};

export const getAdminOrders = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query, 20, 50);
    const filter = {};
    if (ORDER_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (ADMIN_PAYMENT_STATUSES.includes(req.query.paymentStatus)) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
      const pattern = new RegExp(escaped, "i");
      filter.$or = [
        { orderNumber: pattern },
        { "shippingAddress.fullName": pattern },
        { "shippingAddress.email": pattern },
      ];
    }

    const [orders, total] = await Promise.all([
      orderModel
        .find(filter)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      orderModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Load admin orders failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load orders." });
  }
};

/** Store-wide KPIs for the admin overview. */
export const getAdminOrderStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      statusGroups,
      paymentGroups,
      revenueGroups,
      recentRevenue,
      productGroups,
      customerCount,
      topProducts,
    ] = await Promise.all([
      orderModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      orderModel.aggregate([
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
      ]),
      orderModel.aggregate([
        { $match: { paymentStatus: "paid" } },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      orderModel.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      productModel.aggregate([
        {
          $group: {
            _id: null,
            products: { $sum: 1 },
            unitsInStock: { $sum: "$stock" },
            lowStock: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 5] }] },
                  1,
                  0,
                ],
              },
            },
            outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
          },
        },
      ]),
      userModel.countDocuments({}),
      orderModel.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.name" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineTotal" },
          },
        },
        { $sort: { units: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const toMap = (groups) =>
      groups.reduce((accumulator, group) => {
        accumulator[group._id] = group.count;
        return accumulator;
      }, {});

    const statusCounts = toMap(statusGroups);
    const paymentCounts = toMap(paymentGroups);
    const products = productGroups[0] || {
      products: 0,
      unitsInStock: 0,
      lowStock: 0,
      outOfStock: 0,
    };
    const paid = revenueGroups[0] || { revenue: 0, count: 0 };
    const recent = recentRevenue[0] || { revenue: 0, count: 0 };

    return res.status(200).json({
      success: true,
      stats: {
        orders: {
          total: Object.values(statusCounts).reduce(
            (total, count) => total + count,
            0,
          ),
          byStatus: {
            pending: statusCounts.pending || 0,
            processing: statusCounts.processing || 0,
            shipped: statusCounts.shipped || 0,
            delivered: statusCounts.delivered || 0,
            cancelled: statusCounts.cancelled || 0,
          },
          byPaymentStatus: {
            unpaid: paymentCounts.unpaid || 0,
            pending: paymentCounts.pending || 0,
            paid: paymentCounts.paid || 0,
            failed: paymentCounts.failed || 0,
            refunded: paymentCounts.refunded || 0,
          },
        },
        revenue: {
          total: roundMoney(paid.revenue),
          paidOrders: paid.count,
          last30Days: roundMoney(recent.revenue),
          last30DaysOrders: recent.count,
          averageOrderValue: roundMoney(paid.count ? paid.revenue / paid.count : 0),
          currency: env.currency,
        },
        inventory: {
          products: products.products,
          unitsInStock: products.unitsInStock,
          lowStock: products.lowStock,
          outOfStock: products.outOfStock,
        },
        customers: { total: customerCount },
        topProducts: topProducts.map((product) => ({
          productId: String(product._id),
          name: product.name,
          units: product.units,
          revenue: roundMoney(product.revenue),
        })),
        fulfillmentOrder: PROGRESSIVE_STATUSES,
      },
    });
  } catch (error) {
    console.error("Load admin stats failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load store statistics." });
  }
};

export const updateAdminOrder = async (req, res) => {
  const restockedItems = [];
  let claimedOrder = null;
  let previousOrder = null;
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });

    const { status, paymentStatus, adminNote } = req.body;
    if (status && !ORDER_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid fulfillment status." });
    }
    if (
      status &&
      status !== order.status &&
      !allowedTransitions[order.status]?.includes(status)
    ) {
      return res.status(409).json({
        success: false,
        message: `Order cannot move from ${order.status} to ${status}.`,
      });
    }
    if (
      paymentStatus &&
      !["unpaid", "pending", "paid", "failed", "refunded"].includes(paymentStatus)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment status." });
    }
    if (adminNote !== undefined && typeof adminNote !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order note." });
    }

    const cancelling = status === "cancelled" && order.status !== "cancelled";
    if (
      cancelling &&
      order.paymentStatus === "paid" &&
      paymentStatus !== "refunded"
    ) {
      return res.status(409).json({
        success: false,
        message: "Mark this payment refunded before cancelling the paid order.",
      });
    }

    const changes = {};
    if (status) changes.status = status;
    if (paymentStatus) changes.paymentStatus = paymentStatus;
    if (adminNote !== undefined) {
      changes.adminNote = adminNote.trim().slice(0, 500);
    }
    if (cancelling) changes.inventoryRestored = true;

    previousOrder = {
      status: order.status,
      paymentStatus: order.paymentStatus,
      adminNote: order.adminNote,
      inventoryRestored: order.inventoryRestored,
    };

    claimedOrder = await orderModel.findOneAndUpdate(
      {
        _id: order._id,
        status: order.status,
        ...(cancelling ? { inventoryRestored: { $ne: true } } : {}),
      },
      { $set: changes },
      { new: true, runValidators: true },
    );
    if (!claimedOrder) {
      return res.status(409).json({
        success: false,
        message:
          "This order changed while you were editing it. Refresh and try again.",
      });
    }

    if (cancelling) {
      for (const item of order.items) {
        await productModel.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } },
        );
        restockedItems.push({
          productId: item.productId,
          quantity: item.quantity,
        });
      }
    }

    return res.status(200).json({ success: true, order: claimedOrder });
  } catch (error) {
    if (restockedItems.length) {
      try {
        for (const item of restockedItems) {
          await productModel.updateOne(
            { _id: item.productId, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
          );
        }
      } catch (rollbackError) {
        console.error(
          "Order cancellation stock rollback failed:",
          rollbackError,
        );
      }
    }
    if (claimedOrder && previousOrder) {
      try {
        await orderModel.updateOne(
          { _id: claimedOrder._id, status: claimedOrder.status },
          { $set: previousOrder },
        );
      } catch (rollbackError) {
        console.error("Order status rollback failed:", rollbackError);
      }
    }
    console.error("Update admin order failed:", error);
    return res
      .status(error.name === "CastError" ? 404 : 500)
      .json({ success: false, message: "Could not update this order." });
  }
};

