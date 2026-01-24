import mongoose from "mongoose";

const productIngredientSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },
    percentage: {
      type: Number,
      default: null,
    },
    isKeyIngredient: {
      type: Boolean,
      default: false,
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

productIngredientSchema.index({ product: 1, ingredient: 1 }, { unique: true });
productIngredientSchema.index({ product: 1, sortOrder: 1 });

const ProductIngredient = mongoose.model(
  "ProductIngredient",
  productIngredientSchema
);

export default ProductIngredient;
