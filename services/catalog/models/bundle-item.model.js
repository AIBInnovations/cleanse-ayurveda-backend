import mongoose from "mongoose";

const bundleItemSchema = new mongoose.Schema(
  {
    bundle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bundle",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

bundleItemSchema.index({ bundle: 1, sortOrder: 1 });
bundleItemSchema.index({ bundle: 1, product: 1 });
bundleItemSchema.index({ product: 1 }); // For efficient lookup of bundles containing a product

const BundleItem = mongoose.model("BundleItem", bundleItemSchema);

export default BundleItem;
