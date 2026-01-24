import mongoose from "mongoose";
import { CHECKOUT_STATUS } from "../utils/constants.js";

const checkoutSessionSchema = new mongoose.Schema(
  {
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true
    },
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
    phoneVerified: {
      type: Boolean,
      default: false
    },
    phoneVerifiedAt: {
      type: Date,
      sparse: true
    },
    status: {
      type: String,
      enum: Object.values(CHECKOUT_STATUS),
      default: CHECKOUT_STATUS.INITIATED,
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
    shippingAddressId: {
      type: String,
      sparse: true
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
      default: null
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
      default: null
    },
    shippingMethodId: {
      type: String,
      sparse: true
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
      default: null
    },
    currency: {
      type: String,
      default: "INR"
    },
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    discountTotal: {
      type: Number,
      default: 0
    },
    shippingTotal: {
      type: Number,
      default: 0
    },
    taxTotal: {
      type: Number,
      default: 0
    },
    taxBreakdown: {
      type: {
        taxAmount: Number,
        taxRate: Number,
        taxableAmount: Number,
        cgst: Number,
        sgst: Number
      },
      default: null
    },
    grandTotal: {
      type: Number,
      default: 0
    },
    itemCount: {
      type: Number,
      default: 0
    },
    appliedCoupons: {
      type: [String],
      default: []
    },
    appliedDiscounts: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    shippingMethod: {
      type: {
        methodId: String,
        cost: Number,
        estimatedDeliveryDays: Number
      },
      default: null
    },
    shippingAddress: {
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
      default: null
    },
    billingAddress: {
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
      default: null
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      sparse: true
    },
    failureReason: {
      type: String,
      sparse: true
    },
    totalsSnapshot: {
      type: {
        subtotal: Number,
        discountTotal: Number,
        shippingTotal: Number,
        taxTotal: Number,
        grandTotal: Number,
        itemCount: Number
      },
      default: null
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
    expiresAt: {
      type: Date,
      required: true
      // TTL index is defined below with expireAfterSeconds: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
checkoutSessionSchema.index({ userId: 1, status: 1 });
checkoutSessionSchema.index({ sessionId: 1, status: 1 });
checkoutSessionSchema.index({ userType: 1, status: 1 });
checkoutSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
checkoutSessionSchema.index({ createdAt: 1 });

export const CheckoutSession = mongoose.model("CheckoutSession", checkoutSessionSchema);

export default CheckoutSession;
