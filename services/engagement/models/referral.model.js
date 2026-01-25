import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referrerCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    refereeEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "signed_up", "converted", "rewarded"],
      default: "pending",
      index: true,
    },
    refereeFirstOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    referrerRewardPoints: {
      type: Number,
      default: 0,
    },
    refereeRewardPoints: {
      type: Number,
      default: 0,
    },
    rewardsIssued: {
      type: Boolean,
      default: false,
    },
    rewardsIssuedAt: {
      type: Date,
      default: null,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      trim: true,
      default: null,
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    flaggedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding referral by code
referralSchema.index({ referrerCode: 1 });
// Index for finding referrals by status
referralSchema.index({ status: 1, createdAt: -1 });

const Referral = mongoose.model("Referral", referralSchema);

export default Referral;
