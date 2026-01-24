import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true
    },
    productId: {
      type: String,
      required: true,
      index: true
    },
    variantId: {
      type: String,
      required: true,
      index: true
    },
    bundleId: {
      type: String,
      sparse: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    unitMrp: {
      type: Number,
      required: true,
      min: 0
    },
    lineDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    },
    isFreeGift: {
      type: Boolean,
      default: false
    },
    giftRuleId: {
      type: String,
      sparse: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    priceSnapshot: {
      type: {
        unitPrice: Number,
        unitMrp: Number,
        capturedAt: Date,
        discountPercent: Number
      },
      default: null
    },
    productStatus: {
      type: {
        productExists: { type: Boolean, default: true },
        variantExists: { type: Boolean, default: true },
        lastCheckedAt: Date
      },
      default: () => ({
        productExists: true,
        variantExists: true,
        lastCheckedAt: new Date()
      })
    },
    priceChanged: {
      type: Boolean,
      default: false
    },
    priceChangeDetails: {
      type: {
        oldPrice: Number,
        newPrice: Number,
        changedAt: Date
      },
      default: null
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Indexes
cartItemSchema.index({ cartId: 1, productId: 1, variantId: 1 });
cartItemSchema.index({ addedAt: 1 });

// Prevent duplicate items in the same cart
cartItemSchema.index(
  { cartId: 1, variantId: 1, bundleId: 1 },
  { unique: true, sparse: true }
);

export const CartItem = mongoose.model("CartItem", cartItemSchema);

export default CartItem;
