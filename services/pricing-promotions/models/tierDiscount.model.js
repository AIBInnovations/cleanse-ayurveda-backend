import mongoose from "mongoose";

const tierLevelSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      required: true,
      min: 0,
    },
    max: {
      type: Number,
      default: null,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed_amount"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    badge: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const tierDiscountSchema = new mongoose.Schema(
  {
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
      enum: ["cart_value", "cart_quantity"],
      required: true,
    },
    levels: {
      type: [tierLevelSchema],
      required: true,
      validate: {
        validator: function (levels) {
          return levels && levels.length > 0;
        },
        message: "At least one tier level is required",
      },
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
  },
  {
    timestamps: true,
  }
);

// Compound indexes
tierDiscountSchema.index({ isActive: 1, type: 1 });
tierDiscountSchema.index({ startsAt: 1, endsAt: 1 });

const TierDiscount = mongoose.model("TierDiscount", tierDiscountSchema);

export default TierDiscount;
