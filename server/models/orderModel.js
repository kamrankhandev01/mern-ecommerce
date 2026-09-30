import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    addressLine1: { type: String, required: true, trim: true, maxlength: 160 },
    addressLine2: { type: String, trim: true, maxlength: 160, default: "" },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    region: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 24 },
    country: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [
        (items) => items.length > 0,
        "An order needs at least one item",
      ],
    },
    shippingAddress: { type: shippingAddressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["offline", "stripe", "safepay"],
      default: "offline",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded"],
      default: "unpaid",
      index: true,
    },
    currency: { type: String, default: "USD", uppercase: true },
    providerSessionId: { type: String, default: "", index: true },
    providerPaymentId: { type: String, default: "" },
    paymentExpiresAt: { type: Date, default: null },
    inventoryRestored: { type: Boolean, default: false },
    adminNote: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

const orderModel = mongoose.model("order", orderSchema);

export default orderModel;
