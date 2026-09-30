import mongoose from "mongoose";

/**
 * Messages sent through the contact page. Visitors do not need an account, so
 * `userId` is optional and only set when the sender is signed in.
 */
const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ["new", "read", "archived"],
      default: "new",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true },
);

const contactModel = mongoose.model("contact", contactSchema);

export default contactModel;
