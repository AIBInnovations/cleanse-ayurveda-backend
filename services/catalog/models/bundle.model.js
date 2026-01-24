import mongoose from "mongoose";

const bundleSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
      index: true,
    },
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
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    pricingType: {
      type: String,
      enum: ["fixed", "percentageOff"],
      required: true,
    },
    fixedPrice: {
      type: Number,
      default: null,
    },
    percentageOff: {
      type: Number,
      default: null,
    },
    originalPrice: {
      type: Number,
      default: 0,
    },
    finalPrice: {
      type: Number,
      default: 0,
    },
    savings: {
      type: Number,
      default: 0,
    },
    validFrom: {
      type: Date,
      default: null,
    },
    validTo: {
      type: Date,
      default: null,
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

bundleSchema.index({ isActive: 1, deletedAt: 1 });
bundleSchema.index({ validFrom: 1, validTo: 1 });

const Bundle = mongoose.model("Bundle", bundleSchema);

export default Bundle;
