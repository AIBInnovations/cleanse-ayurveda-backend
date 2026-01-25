import mongoose from "mongoose";

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    loyaltyAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoyaltyAccount",
      required: true,
    },
    type: {
      type: String,
      enum: ["earn", "redeem", "expire", "adjust"],
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ["order", "signup", "review", "referral", "manual", "expiry", "birthday"],
      default: null,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ type: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ referenceType: 1, referenceId: 1 });

const LoyaltyTransaction = mongoose.model("LoyaltyTransaction", loyaltyTransactionSchema);

export default LoyaltyTransaction;
