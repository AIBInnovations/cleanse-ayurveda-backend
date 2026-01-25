import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
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
    excerpt: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    author_name: {
      type: String,
      trim: true,
    },
    featured_image_url: {
      type: String,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogCategory",
    },
    tags: {
      type: [String],
      default: [],
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    view_count: {
      type: Number,
      default: 0,
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

export default mongoose.model("Blog", blogSchema);
