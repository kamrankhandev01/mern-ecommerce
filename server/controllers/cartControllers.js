import mongoose from "mongoose";
import cartModel from "../models/cartModel.js";
import productModel from "../models/productModel.js";
import { calculateTotals, roundMoney } from "../utils/pricing.js";
import env from "../config/env.js";

const MAX_QUANTITY = Math.min(env.maxItemsPerOrder, 99);

/** An item is only kept if the product still exists and is purchasable. */
const normalizeQuantity = (quantity) =>
  Math.min(Math.max(Math.trunc(Number(quantity) || 0), 0), MAX_QUANTITY);

/**
 * Turn the stored `{ productId, quantity }` pairs into a fully resolved cart
 * using live product data. Deleted products and impossible quantities are
 * pruned here, so the client can always trust what it receives.
 */
const resolveCart = async (userId) => {
  const cart = await cartModel
    .findOne({ userId })
    .select("items")
    .lean({ defaults: false });

  const storedItems = cart?.items || [];
  if (storedItems.length === 0) {
    return { changed: false, items: [], totals: calculateTotals([]) };
  }

  const products = await productModel
    .find({ _id: { $in: storedItems.map((item) => item.productId) } })
    .select("name category price stock images isBestSeller")
    .lean();

  const productById = new Map(
    products.map((product) => [String(product._id), product]),
  );

  const items = [];
  const nextStored = [];
  let changed = false;

  for (const stored of storedItems) {
    const product = productById.get(String(stored.productId));
    if (!product) {
      changed = true;
      continue;
    }
    const available = Math.max(Math.trunc(Number(product.stock) || 0), 0);
    const quantity = Math.min(normalizeQuantity(stored.quantity), available);
    if (quantity < 1) {
      changed = true;
      continue;
    }
    if (quantity !== stored.quantity) changed = true;

    nextStored.push({ productId: product._id, quantity });
    const price = roundMoney(product.price);
    items.push({
      productId: String(product._id),
      name: product.name,
      category: product.category,
      price,
      stock: available,
      image: product.images?.find((image) => image.url)?.url || "",
      quantity,
      lineTotal: roundMoney(price * quantity),
    });
  }

  if (changed) {
    await cartModel.updateOne(
      { userId },
      { $set: { items: nextStored } },
      { upsert: true },
    );
  }

  return { changed, items, totals: calculateTotals(items) };
};

const buildPayload = (items, totals) => ({
  items,
  itemCount: items.reduce((total, item) => total + item.quantity, 0),
  ...totals,
  maxQuantityPerItem: MAX_QUANTITY,
  freeShippingThreshold: env.freeShippingThreshold,
});

const respondWithCart = async (res, userId, status = 200) => {
  const { items, totals } = await resolveCart(userId);
  return res.status(status).json({ success: true, cart: buildPayload(items, totals) });
};

/** Read the current quantities for a user as a Map (used by order creation). */
export const getStoredCartQuantities = async (userId) => {
  const cart = await cartModel.findOne({ userId }).select("items").lean();
  const quantities = new Map();
  for (const item of cart?.items || []) {
    quantities.set(String(item.productId), normalizeQuantity(item.quantity));
  }
  return quantities;
};

export const clearUserCart = async (userId) => {
  await cartModel.updateOne({ userId }, { $set: { items: [] } });
};

export const getCart = async (req, res) => {
  try {
    return await respondWithCart(res, req.userId);
  } catch (error) {
    console.error("Load cart failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load your cart." });
  }
};

export const addCartItem = async (req, res) => {
  try {
    const productId = String(req.body.productId || "");
    const quantity = normalizeQuantity(req.body.quantity ?? 1);
    if (!mongoose.isValidObjectId(productId) || quantity < 1) {
      return res
        .status(400)
        .json({ success: false, message: "That item could not be added." });
    }

    const product = await productModel
      .findById(productId)
      .select("stock name")
      .lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "This product is no longer sold." });
    }
    const available = Math.max(Math.trunc(Number(product.stock) || 0), 0);
    if (available < 1) {
      return res.status(409).json({
        success: false,
        message: `${product.name} is currently out of stock.`,
      });
    }

    const cart =
      (await cartModel.findOne({ userId: req.userId })) ??
      new cartModel({ userId: req.userId, items: [] });

    const existing = cart.items.find(
      (item) => String(item.productId) === productId,
    );
    const requested = (existing?.quantity || 0) + quantity;
    const nextQuantity = Math.min(requested, available, MAX_QUANTITY);

    if (existing) existing.quantity = nextQuantity;
    else cart.items.push({ productId, quantity: nextQuantity });

    await cart.save();
    return await respondWithCart(res, req.userId, 200);
  } catch (error) {
    console.error("Add to cart failed:", error);
    return res
      .status(error.name === "CastError" ? 400 : 500)
      .json({ success: false, message: "Could not add that item to your cart." });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const productId = String(req.params.productId || "");
    if (!mongoose.isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "That cart item is invalid." });
    }
    const quantity = normalizeQuantity(req.body.quantity);
    const cart = await cartModel.findOne({ userId: req.userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Your cart is empty." });
    }

    if (quantity < 1) {
      cart.items = cart.items.filter(
        (item) => String(item.productId) !== productId,
      );
      await cart.save();
      return await respondWithCart(res, req.userId);
    }

    const product = await productModel
      .findById(productId)
      .select("stock name")
      .lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "This product is no longer sold." });
    }
    const available = Math.max(Math.trunc(Number(product.stock) || 0), 0);
    if (available < 1) {
      cart.items = cart.items.filter(
        (item) => String(item.productId) !== productId,
      );
      await cart.save();
      const { items, totals } = await resolveCart(req.userId);
      return res.status(409).json({
        success: false,
        message: `${product.name} is currently out of stock.`,
        cart: buildPayload(items, totals),
      });
    }

    const existing = cart.items.find(
      (item) => String(item.productId) === productId,
    );
    if (existing) {
      existing.quantity = Math.min(quantity, available, MAX_QUANTITY);
    } else {
      cart.items.push({
        productId,
        quantity: Math.min(quantity, available, MAX_QUANTITY),
      });
    }
    await cart.save();
    return await respondWithCart(res, req.userId);
  } catch (error) {
    console.error("Update cart item failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not update your cart." });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const productId = String(req.params.productId || "");
    if (!mongoose.isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "That cart item is invalid." });
    }
    await cartModel.updateOne(
      { userId: req.userId },
      { $pull: { items: { productId } } },
    );
    return await respondWithCart(res, req.userId);
  } catch (error) {
    console.error("Remove cart item failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not update your cart." });
  }
};

export const clearCart = async (req, res) => {
  try {
    await clearUserCart(req.userId);
    return await respondWithCart(res, req.userId);
  } catch (error) {
    console.error("Clear cart failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not empty your cart." });
  }
};

/**
 * Merge a browser-side guest cart into the signed-in account.
 * Quantities are summed, then clamped to live stock by `resolveCart`.
 */
export const mergeCart = async (req, res) => {
  try {
    const incoming = Array.isArray(req.body.items) ? req.body.items : [];
    if (incoming.length === 0) {
      return await respondWithCart(res, req.userId);
    }

    const requested = new Map();
    for (const item of incoming.slice(0, 100)) {
      const productId = String(item?.productId || "");
      const quantity = normalizeQuantity(item?.quantity);
      if (!mongoose.isValidObjectId(productId) || quantity < 1) continue;
      requested.set(productId, (requested.get(productId) || 0) + quantity);
    }

    if (requested.size === 0) {
      return await respondWithCart(res, req.userId);
    }

    const cart =
      (await cartModel.findOne({ userId: req.userId })) ??
      new cartModel({ userId: req.userId, items: [] });

    for (const [productId, quantity] of requested) {
      const existing = cart.items.find(
        (item) => String(item.productId) === productId,
      );
      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY);
      } else {
        cart.items.push({
          productId,
          quantity: Math.min(quantity, MAX_QUANTITY),
        });
      }
    }

    await cart.save();
    return await respondWithCart(res, req.userId);
  } catch (error) {
    console.error("Merge cart failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not restore your cart." });
  }
};
