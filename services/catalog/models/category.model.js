import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    level: {
      type: Number,
      default: 0,
    },
    path: {
      type: String,
      default: null,
    },
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    banner: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    seo: {
      title: { type: String, default: null },
      description: { type: String, default: null },
      keywords: { type: [String], default: [] },
    },
    showInMenu: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ name: "text" });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1, deletedAt: 1, showInMenu: 1 });
categorySchema.index({ path: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;
