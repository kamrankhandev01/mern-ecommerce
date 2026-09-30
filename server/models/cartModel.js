import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false },
);

/**
 * One persistent cart per account. Guest carts live only in the browser and
 * are merged into this document the moment the user signs in.
 *
 * Prices and stock are never stored here — they are always resolved from the
 * live product catalogue so a stale cart can never influence totals.
 */
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

const cartModel = mongoose.model("cart", cartSchema);

export default cartModel;
