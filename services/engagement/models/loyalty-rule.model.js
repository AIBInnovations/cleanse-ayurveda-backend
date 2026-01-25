import mongoose from "mongoose";

const loyaltyRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ruleType: {
      type: String,
      enum: ["earn", "redeem"],
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ["purchase", "signup", "review", "referral", "birthday"],
      required: true,
    },
    pointsValue: {
      type: Number,
      required: true,
      min: 0,
    },
    pointsPerAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxPointsPerOrder: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    validFrom: {
      type: Date,
      default: null,
    },
    validUntil: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

loyaltyRuleSchema.index({ ruleType: 1, actionType: 1 });
loyaltyRuleSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

const LoyaltyRule = mongoose.model("LoyaltyRule", loyaltyRuleSchema);

export default LoyaltyRule;
