import mongoose from "mongoose";

const popupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["newsletter", "promo", "exit_intent"],
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    image_url: {
      type: String,
    },
    cta_text: {
      type: String,
      trim: true,
    },
    cta_url: {
      type: String,
      trim: true,
    },
    trigger_type: {
      type: String,
      enum: ["time_delay", "exit_intent"],
      default: "time_delay",
    },
    trigger_value: {
      type: String,
    },
    frequency: {
      type: String,
      enum: ["once", "session", "daily"],
      default: "session",
    },
    target_pages: {
      type: [String],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    starts_at: {
      type: Date,
    },
    ends_at: {
      type: Date,
    },
    discount_code: {
      type: String,
      trim: true,
      default: null,
    },
    stats: {
      impressions: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      submissions: {
        type: Number,
        default: 0,
      },
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

export default mongoose.model("Popup", popupSchema);
