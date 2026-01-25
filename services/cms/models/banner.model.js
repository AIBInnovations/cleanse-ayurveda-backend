import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    placement: {
      type: String,
      enum: ["hero", "top_strip", "mid_page"],
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    cta_text: {
      type: String,
      trim: true,
    },
    cta_url: {
      type: String,
      trim: true,
    },
    image_desktop_url: {
      type: String,
    },
    image_mobile_url: {
      type: String,
    },
    target_pages: {
      type: [String],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    starts_at: {
      type: Date,
    },
    ends_at: {
      type: Date,
    },
    created_by_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

export default mongoose.model("Banner", bannerSchema);
