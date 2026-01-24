import mongoose from "mongoose";

const productMediaSchema = new mongoose.Schema(
  {
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
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: null,
    },
    altText: {
      type: String,
      default: null,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    metadata: {
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      format: { type: String, default: null },
      bytes: { type: Number, default: null },
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

productMediaSchema.index({ product: 1, deletedAt: 1 });
productMediaSchema.index({ product: 1, isPrimary: 1 });
productMediaSchema.index({ variant: 1 });

const ProductMedia = mongoose.model("ProductMedia", productMediaSchema);

export default ProductMedia;
