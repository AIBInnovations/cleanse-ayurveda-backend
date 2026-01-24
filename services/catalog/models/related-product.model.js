import mongoose from "mongoose";

const relatedProductSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    relatedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    relationType: {
      type: String,
      enum: ["crossSell", "upSell", "frequentlyBoughtTogether"],
      required: true,
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

relatedProductSchema.index(
  { product: 1, relatedProduct: 1, relationType: 1 },
  { unique: true }
);
relatedProductSchema.index({ product: 1, relationType: 1, sortOrder: 1 });

const RelatedProduct = mongoose.model("RelatedProduct", relatedProductSchema);

export default RelatedProduct;
