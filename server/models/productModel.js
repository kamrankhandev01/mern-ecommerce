import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, maxlength: 80, index: true },
    stock: { type: Number, required: true, min: 0, max: 100000 },
    isBestSeller: { type: Boolean, default: false, index: true },
    images: {
      type: [
        new mongoose.Schema(
          {
            url: { type: String, required: true },
            public_id: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    attributes: { type: Map, of: String, default: {} },
  },
  {
    timestamps: true,
    toJSON: { getters: false, virtuals: true },
  },
);

// Supports the collection search across name, description and category.
productSchema.index({ name: "text", description: "text", category: "text" });

const productModel = mongoose.model("product", productSchema);

export default productModel;
