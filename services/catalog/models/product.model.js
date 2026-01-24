import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
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
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    shortDescription: {
      type: String,
      default: null,
    },
    benefits: {
      type: [String],
      default: [],
    },
    howToUse: {
      type: String,
      default: null,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    productType: {
      type: String,
      enum: ["simple", "variable", "bundle"],
      default: "simple",
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    attributes: {
      skinType: {
        type: [String],
        enum: ["oily", "dry", "combination", "sensitive", "normal"],
        default: [],
      },
      concerns: {
        type: [String],
        default: [],
      },
    },
    seo: {
      title: { type: String, default: null },
      description: { type: String, default: null },
      keywords: { type: [String], default: [] },
    },
    hsnCode: {
      type: String,
      default: null,
    },
    ratingSummary: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ status: 1, deletedAt: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ isFeatured: 1, isBestseller: 1, isNewArrival: 1 });
productSchema.index({ "attributes.skinType": 1 });
productSchema.index({ "attributes.concerns": 1 });
productSchema.index({ createdAt: -1 });

// Pre-save hook to increment version on modification
productSchema.pre("save", function () {
  if (!this.isNew && this.isModified()) {
    this.version = (this.version || 0) + 1;
  }
});

const Product = mongoose.model("Product", productSchema);

export default Product;
