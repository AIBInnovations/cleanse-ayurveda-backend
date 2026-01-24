import mongoose from "mongoose";

const automaticDiscountSchema = new mongoose.Schema(
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
      enum: ["percentage", "fixed_amount"],
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
    appliesTo: {
      type: String,
      enum: ["cart", "specific_products", "specific_collections"],
      default: "cart",
    },
    applicableIds: {
      type: [String],
      default: [],
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    isStackable: {
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
  },
  {
    timestamps: true,
  }
);

// Compound indexes
automaticDiscountSchema.index({ isActive: 1, priority: -1 });
automaticDiscountSchema.index({ startsAt: 1, endsAt: 1 });

const AutomaticDiscount = mongoose.model("AutomaticDiscount", automaticDiscountSchema);

export default AutomaticDiscount;
