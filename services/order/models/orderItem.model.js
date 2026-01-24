import mongoose from "mongoose";
import { FULFILLMENT_STATUS } from "../utils/constants.js";

const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
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
    sku: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    quantityFulfilled: {
      type: Number,
      default: 0,
      min: 0
    },
    quantityReturned: {
      type: Number,
      default: 0,
      min: 0
    },
    quantityRefunded: {
      type: Number,
      default: 0,
      min: 0
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
    lineTax: {
      type: Number,
      default: 0,
      min: 0
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    },
    hsnCode: {
      type: String,
      trim: true
    },
    isFreeGift: {
      type: Boolean,
      default: false
    },
    fulfillmentStatus: {
      type: String,
      enum: Object.values(FULFILLMENT_STATUS),
      default: FULFILLMENT_STATUS.UNFULFILLED,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Indexes
orderItemSchema.index({ orderId: 1, fulfillmentStatus: 1 });
orderItemSchema.index({ productId: 1, variantId: 1 });
orderItemSchema.index({ createdAt: 1 });

export const OrderItem = mongoose.model("OrderItem", orderItemSchema);

export default OrderItem;
