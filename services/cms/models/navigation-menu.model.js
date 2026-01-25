import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    children: {
      type: [
        {
          title: { type: String, trim: true },
          url: { type: String, trim: true },
          children: { type: Array, default: [] },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const navigationMenuSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      required: true,
      unique: true,
      enum: ["main_header", "footer", "mobile_nav", "footer_secondary"],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [menuItemSchema],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export default mongoose.model("NavigationMenu", navigationMenuSchema);
