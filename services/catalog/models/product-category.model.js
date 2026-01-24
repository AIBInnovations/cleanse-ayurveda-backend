import mongoose from "mongoose";

const productCategorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

productCategorySchema.index({ product: 1, category: 1 }, { unique: true });
productCategorySchema.index({ category: 1 });
productCategorySchema.index({ product: 1, isPrimary: 1 });

const ProductCategory = mongoose.model(
  "ProductCategory",
  productCategorySchema
);

export default ProductCategory;
