import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },
  },
  { _id: false },
);

/**
 * One saved-items list per account. Guest wishlists live in the browser and are
 * merged into this document the moment the user signs in.
 *
 * Only the product reference is stored — name, price, stock and images are
 * always resolved from the live catalogue, so a saved item can never show a
 * stale price.
 */
const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [wishlistItemSchema], default: [] },
  },
  { timestamps: true },
);

const wishlistModel = mongoose.model("wishlist", wishlistSchema);

export default wishlistModel;
