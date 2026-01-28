import mongoose from "mongoose";
import { CART_STATUS } from "../utils/constants.js";

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: false,
      sparse: true,
      index: true
    },
    sessionId: {
      type: String,
      sparse: true,
      index: true
    },
    userType: {
      type: String,
      enum: ["registered", "guest"],
      default: "registered"
    },
    status: {
      type: String,
      enum: Object.values(CART_STATUS),
      default: CART_STATUS.ACTIVE,
      index: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    discountTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    shippingTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    taxTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    itemCount: {
      type: Number,
      default: 0,
      min: 0
    },
    appliedCoupons: {
      type: [
        {
          couponId: String,
          code: String,
          discountAmount: Number,
          discountType: String,
          appliedAt: Date
        }
      ],
      default: []
    },
    appliedDiscounts: {
      type: [
        {
          discountId: String,
          name: String,
          discountAmount: Number,
          discountType: String,
          appliedAt: Date
        }
      ],
      default: []
    },
    freeGifts: {
      type: [
        {
          ruleId: String,
          productId: String,
          variantId: String,
          quantity: Number,
          addedAt: Date
        }
      ],
      default: []
    },
    source: {
      type: String,
      enum: ["web", "mobile"],
      default: "web"
    },
    convertedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      sparse: true
    },
    expiresAt: {
      type: Date,

    },
    version: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
cartSchema.index({ userId: 1, status: 1 });
cartSchema.index({ sessionId: 1, status: 1 });
cartSchema.index({ userType: 1, status: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cartSchema.index({ createdAt: 1 });

// Pre-validate hook to ensure either userId or sessionId exists
cartSchema.pre("validate", function () {
  if (!this.userId && !this.sessionId) {
    throw new Error("Cart must have either userId or sessionId");
  }
});

// Pre-save hook to increment version on modification (for optimistic locking)
cartSchema.pre("save", function () {
  if (!this.isNew && this.isModified()) {
    this.version = (this.version || 0) + 1;
  }
});

// Virtual for items
cartSchema.virtual("items", {
  ref: "CartItem",
  localField: "_id",
  foreignField: "cartId"
});

// Configure toJSON to include virtuals
cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

export const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
