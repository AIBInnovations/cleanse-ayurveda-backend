import mongoose from "mongoose";

const storeCreditTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    storeCredit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreCredit",
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ["refund", "reward", "order", "manual", "referral", "expired"],
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

storeCreditTransactionSchema.index({ user: 1, createdAt: -1 });
storeCreditTransactionSchema.index({ type: 1, createdAt: -1 });
storeCreditTransactionSchema.index({ referenceType: 1, referenceId: 1 });

const StoreCreditTransaction = mongoose.model("StoreCreditTransaction", storeCreditTransactionSchema);

export default StoreCreditTransaction;
