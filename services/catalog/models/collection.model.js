import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["manual", "smart"],
      default: "manual",
    },
    rules: [
      {
        field: {
          type: String,
          enum: ["tag", "productType", "price", "brand", "status"],
        },
        operator: {
          type: String,
          enum: ["equals", "notEquals", "contains", "greaterThan", "lessThan"],
        },
        value: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    rulesMatch: {
      type: String,
      enum: ["all", "any"],
      default: "all",
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
    isFeatured: {
      type: Boolean,
      default: false,
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

collectionSchema.index({ isActive: 1, deletedAt: 1 });
collectionSchema.index({ isFeatured: 1 });
collectionSchema.index({ type: 1 });

const Collection = mongoose.model("Collection", collectionSchema);

export default Collection;
