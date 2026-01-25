import mongoose from "mongoose";

const pageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    page_type: {
      type: String,
      enum: ["static", "policy"],
      default: "static",
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    is_system: {
      type: Boolean,
      default: false,
    },
    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: { type: [String], default: [] },
    },
    published_at: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export default mongoose.model("Page", pageSchema);
