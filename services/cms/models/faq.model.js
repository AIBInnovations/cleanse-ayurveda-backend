import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      enum: ["general", "shipping", "payment", "returns", "account", "products"],
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

export default mongoose.model("Faq", faqSchema);
