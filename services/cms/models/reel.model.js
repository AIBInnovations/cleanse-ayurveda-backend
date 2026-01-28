import mongoose from "mongoose";

// Sub-schema for product references in reels
const reelProductSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    product_slug: {
      type: String,
      trim: true,
      default: null,
    },
    product_name: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const reelSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    video_url: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnail_url: {
      type: String,
      trim: true,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
    },
    products: {
      type: [reelProductSchema],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
    view_count: {
      type: Number,
      default: 0,
    },
    created_by_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

reelSchema.index({ is_active: 1, sort_order: 1 });
reelSchema.index({ view_count: -1 });

export default mongoose.model("Reel", reelSchema);
