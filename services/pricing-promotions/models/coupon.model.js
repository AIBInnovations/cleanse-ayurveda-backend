import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed_amount", "free_shipping"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: null,
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    usageLimitTotal: {
      type: Number,
      default: null,
    },
    usageLimitPerUser: {
      type: Number,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    appliesTo: {
      type: String,
      enum: ["all", "specific_products", "specific_collections"],
      default: "all",
    },
    applicableIds: {
      type: [String],
      default: [],
    },
    excludedIds: {
      type: [String],
      default: [],
    },
    customerEligibility: {
      type: String,
      enum: ["all", "first_order", "specific_segments"],
      default: "all",
    },
    eligibleSegmentIds: {
      type: [String],
      default: [],
    },
    isStackable: {
      type: Boolean,
      default: false,
    },
    isAutoApply: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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

// Compound indexes
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ startsAt: 1, endsAt: 1 });
couponSchema.index({ isActive: 1, isAutoApply: 1 });
couponSchema.index({ deletedAt: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
