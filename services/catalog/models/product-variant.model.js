import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    barcode: {
      type: String,
      default: null,
    },
    variantType: {
      type: String,
      default: null,
    },
    mrp: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      default: null,
    },
    costPrice: {
      type: Number,
      default: null,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    weight: {
      value: {
        type: Number,
        default: null,
      },
      unit: {
        type: String,
        enum: ["g", "kg", "ml", "L", "oz", "lb"],
        default: null,
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
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

productVariantSchema.index({ product: 1, isActive: 1, deletedAt: 1 });
productVariantSchema.index({ product: 1, isDefault: 1 });

// Pre-save hook to increment version on modification
productVariantSchema.pre("save", function () {
  if (!this.isNew && this.isModified()) {
    this.version = (this.version || 0) + 1;
  }
});

const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);

export default ProductVariant;
