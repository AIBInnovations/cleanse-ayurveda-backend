import mongoose from "mongoose";

const couponUsageSchema = new mongoose.Schema({
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
    index: true,
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  usedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound indexes
couponUsageSchema.index({ couponId: 1, userId: 1 });
couponUsageSchema.index({ usedAt: -1 });

const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);

export default CouponUsage;
