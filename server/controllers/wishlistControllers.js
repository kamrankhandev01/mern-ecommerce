import mongoose from "mongoose";
import wishlistModel from "../models/wishlistModel.js";
import productModel from "../models/productModel.js";
import { roundMoney } from "../utils/pricing.js";

/** Guard against a wishlist growing without bound from a hostile merge. */
const MAX_ITEMS = 200;

const isValidId = (value) =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value.trim());

/**
 * Resolve stored product references against the live catalogue.
 *
 * Products that have been deleted are pruned and written back, so the saved list
 * cannot accumulate ghosts. Out-of-stock products are kept but flagged, because
 * a customer still wants to know an item exists.
 */
const resolveWishlist = async (userId) => {
  const wishlist = await wishlistModel
    .findOne({ userId })
    .select("items")
    .lean({ defaults: false });

  const storedItems = wishlist?.items || [];
  if (storedItems.length === 0) return { changed: false, items: [] };

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
    nextStored.push({ productId: product._id });
    const stock = Math.max(Math.trunc(Number(product.stock) || 0), 0);
    items.push({
      productId: String(product._id),
      name: product.name,
      category: product.category,
      price: roundMoney(product.price),
      stock,
      inStock: stock > 0,
      image: product.images?.find((image) => image.url)?.url || "",
    });
  }

  if (changed) {
    await wishlistModel.updateOne(
      { userId },
      { $set: { items: nextStored } },
      { upsert: true },
    );
  }

  return { changed, items };
};

const respondWithWishlist = async (res, userId, status = 200) => {
  const { items } = await resolveWishlist(userId);
  return res
    .status(status)
    .json({ success: true, wishlist: { items, count: items.length } });
};

export const getWishlist = async (req, res) => {
  try {
    return await respondWithWishlist(res, req.userId);
  } catch (error) {
    console.error("Load wishlist failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load your wishlist." });
  }
};

export const addWishlistItem = async (req, res) => {
  try {
    const productId = String(req.body.productId || "").trim();
    if (!isValidId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "That product could not be found." });
    }

    const product = await productModel.findById(productId).select("_id").lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "That product is no longer available." });
    }

    // $addToSet keeps this idempotent, so double-clicking the heart is safe.
    await wishlistModel.updateOne(
      { userId: req.userId },
      { $addToSet: { items: { productId: product._id } } },
      { upsert: true },
    );

    return await respondWithWishlist(res, req.userId, 201);
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "That product could not be found." });
    }
    console.error("Add to wishlist failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not update your wishlist." });
  }
};

export const removeWishlistItem = async (req, res) => {
  try {
    const productId = String(req.params.productId || "").trim();
    if (!isValidId(productId)) {
      return await respondWithWishlist(res, req.userId);
    }

    await wishlistModel.updateOne(
      { userId: req.userId },
      {
        $pull: {
          items: { productId: new mongoose.Types.ObjectId(productId) },
        },
      },
    );

    return await respondWithWishlist(res, req.userId);
  } catch (error) {
    console.error("Remove from wishlist failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not update your wishlist." });
  }
};

export const clearWishlist = async (req, res) => {
  try {
    await wishlistModel.updateOne(
      { userId: req.userId },
      { $set: { items: [] } },
    );
    return res
      .status(200)
      .json({ success: true, wishlist: { items: [], count: 0 } });
  } catch (error) {
    console.error("Clear wishlist failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not clear your wishlist." });
  }
};

/**
 * Fold a guest wishlist into the account one.
 *
 * A plain union: saving an item twice is meaningless, so nothing is overwritten
 * and nothing the customer chose is ever dropped.
 */
export const mergeWishlist = async (req, res) => {
  try {
    const incoming = Array.isArray(req.body.items) ? req.body.items : [];
    const productIds = [
      ...new Set(
        incoming
          .map((item) => String(item?.productId || item || "").trim())
          .filter(isValidId)
          .slice(0, MAX_ITEMS),
      ),
    ];

    if (productIds.length > 0) {
      // Only keep ids that still exist, so a merge cannot store dead references.
      const existing = await productModel
        .find({ _id: { $in: productIds } })
        .select("_id")
        .lean();

      const wanted = existing.map((product) => ({ productId: product._id }));
      if (wanted.length > 0) {
        await wishlistModel.updateOne(
          { userId: req.userId },
          { $addToSet: { items: { $each: wanted } } },
          { upsert: true },
        );
      }
    }

    return await respondWithWishlist(res, req.userId);
  } catch (error) {
    console.error("Merge wishlist failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not merge your wishlist." });
  }
};
