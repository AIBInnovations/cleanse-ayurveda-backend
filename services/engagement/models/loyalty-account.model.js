import mongoose from "mongoose";

const loyaltyAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    tier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoyaltyTier",
      default: null,
    },
    pointsBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsEarnedLifetime: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsRedeemedLifetime: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentYearSpend: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActivityAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

loyaltyAccountSchema.index({ tier: 1 });
loyaltyAccountSchema.index({ pointsBalance: -1 });

const LoyaltyAccount = mongoose.model("LoyaltyAccount", loyaltyAccountSchema);

export default LoyaltyAccount;
