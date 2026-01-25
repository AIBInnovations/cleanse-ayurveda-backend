import mongoose from "mongoose";

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
    is_active: {
      type: Boolean,
      default: true,
      index: true,
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
      ref: "Admin",
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
