import mongoose from "mongoose";

const freeGiftRuleSchema = new mongoose.Schema(
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
    triggerType: {
      type: String,
      enum: ["cart_value", "product_purchase"],
      required: true,
    },
    triggerValue: {
      type: Number,
      default: null,
    },
    triggerProductIds: {
      type: [String],
      default: [],
    },
    giftProductId: {
      type: String,
      required: true,
    },
    giftVariantId: {
      type: String,
      default: null,
    },
    giftQuantity: {
      type: Number,
      default: 1,
      min: 1,
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
freeGiftRuleSchema.index({ isActive: 1, triggerType: 1 });
freeGiftRuleSchema.index({ startsAt: 1, endsAt: 1 });

const FreeGiftRule = mongoose.model("FreeGiftRule", freeGiftRuleSchema);

export default FreeGiftRule;
