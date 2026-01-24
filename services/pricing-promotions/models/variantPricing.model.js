import mongoose from "mongoose";

const variantPricingSchema = new mongoose.Schema(
  {
    variantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
      index: true,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      default: null,
      min: 0,
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

variantPricingSchema.index({ variantId: 1, effectiveFrom: -1 });
variantPricingSchema.index({ productId: 1, isActive: 1 });

variantPricingSchema.virtual("discountPercent").get(function () {
  if (!this.salePrice || this.salePrice >= this.mrp) {
    return 0;
  }
  return Math.round(((this.mrp - this.salePrice) / this.mrp) * 100);
});

variantPricingSchema.virtual("finalPrice").get(function () {
  return this.salePrice || this.mrp;
});

variantPricingSchema.set("toJSON", { virtuals: true });
variantPricingSchema.set("toObject", { virtuals: true });

const VariantPricing = mongoose.model("VariantPricing", variantPricingSchema);

export default VariantPricing;
