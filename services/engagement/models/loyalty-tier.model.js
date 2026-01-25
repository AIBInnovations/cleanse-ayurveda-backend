import mongoose from "mongoose";

const benefitSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["discount_percent", "free_shipping", "early_access", "exclusive_products", "birthday_bonus", "custom"],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const loyaltyTierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    minPoints: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minSpend: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    pointsMultiplier: {
      type: Number,
      default: 1,
      min: 1,
    },
    benefits: [benefitSchema],
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    color: {
      type: String,
      trim: true,
      default: null,
    },
    icon: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

loyaltyTierSchema.index({ minPoints: 1 });
loyaltyTierSchema.index({ sortOrder: 1 });

const LoyaltyTier = mongoose.model("LoyaltyTier", loyaltyTierSchema);

export default LoyaltyTier;
