import mongoose from "mongoose";
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } from "../utils/constants.js";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String,
      required: false,
      sparse: true,
      index: true
    },
    guestSessionId: {
      type: String,
      sparse: true,
      index: true
    },
    orderType: {
      type: String,
      enum: ["registered", "guest"],
      default: "registered"
    },
    guestInfo: {
      type: {
        firstName: String,
        lastName: String,
        email: String,
        phone: String
      },
      default: null
    },
    checkoutSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CheckoutSession",
      sparse: true
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true
    },
    fulfillmentStatus: {
      type: String,
      enum: Object.values(FULFILLMENT_STATUS),
      default: FULFILLMENT_STATUS.UNFULFILLED,
      index: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    subtotal: {
      type: Number,
      required: true,
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
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    shippingAddressSnapshot: {
      type: {
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        landmark: String,
        city: String,
        state: String,
        pincode: String,
        country: String
      },
      required: true
    },
    billingAddressSnapshot: {
      type: {
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        landmark: String,
        city: String,
        state: String,
        pincode: String,
        country: String
      },
      required: true
    },
    shippingMethodSnapshot: {
      type: {
        methodId: String,
        name: String,
        displayName: String,
        carrierName: String,
        rate: Number,
        estimatedDaysMin: Number,
        estimatedDaysMax: Number,
        isCodAvailable: Boolean
      },
      required: true
    },
    appliedCouponsSnapshot: {
      type: [
        {
          couponId: String,
          code: String,
          discountAmount: Number,
          discountType: String
        }
      ],
      default: []
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "cod", "wallet"],
      default: "razorpay"
    },
    trackingNumber: {
      type: String,
      sparse: true,
      trim: true
    },
    carrierName: {
      type: String,
      sparse: true,
      trim: true
    },
    isGiftOrder: {
      type: Boolean,
      default: false
    },
    giftMessage: {
      type: String,
      maxlength: 500,
      trim: true
    },
    customerNotes: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    internalNotes: {
      type: String,
      maxlength: 2000,
      trim: true
    },
    source: {
      type: String,
      enum: ["web", "mobile"],
      default: "web"
    },
    cancellationReason: {
      type: String,
      maxlength: 500,
      trim: true
    },
    cancelledById: {
      type: String,
      sparse: true
    },
    cancelledAt: {
      type: Date,
      sparse: true
    },
    confirmedAt: {
      type: Date,
      sparse: true
    },
    shippedAt: {
      type: Date,
      sparse: true
    },
    outForDeliveryAt: {
      type: Date,
      sparse: true
    },
    deliveredAt: {
      type: Date,
      sparse: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1 });
orderSchema.index({ status: 1, fulfillmentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ confirmedAt: -1 });
orderSchema.index({ deliveredAt: -1 });

// Virtual for items
orderSchema.virtual("items", {
  ref: "OrderItem",
  localField: "_id",
  foreignField: "orderId"
});

// Virtual for status history
orderSchema.virtual("statusHistory", {
  ref: "OrderStatusHistory",
  localField: "_id",
  foreignField: "orderId"
});

// Virtual for payments
orderSchema.virtual("payments", {
  ref: "Payment",
  localField: "_id",
  foreignField: "orderId"
});

// Configure toJSON to include virtuals
orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

export const Order = mongoose.model("Order", orderSchema);

export default Order;
